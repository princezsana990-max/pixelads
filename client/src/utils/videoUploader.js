import { supabase } from './supabaseClient';
import { apiClient } from '../api/client';

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska'
];

export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv'];

export const validateVideoFile = (file, maxMb = 2048) => {
  if (!file) {
    throw new Error('No video file selected.');
  }

  const nameParts = file.name.split('.');
  const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : '';
  const isExtAllowed = ALLOWED_VIDEO_EXTENSIONS.includes(ext);
  const isMimeAllowed = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isExtAllowed || (!isMimeAllowed && file.type)) {
    throw new Error('Invalid video format. Only mp4, mov, webm, and mkv are allowed.');
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${maxMb} MB.`);
  }

  return true;
};

export const requestVideoUploadUrl = async ({ orderId, file, maxMb = 2048 }) => {
  validateVideoFile(file, maxMb);

  const mimeType = file.type || 'video/mp4';
  const response = await apiClient('/uploads/video-url', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      fileName: file.name,
      mimeType,
      fileSize: file.size
    })
  });

  return response;
};

export const getVideoReadUrl = async (path) => {
  const response = await apiClient(`/uploads/video-read-url?path=${encodeURIComponent(path)}`);
  return response.signedUrl;
};

/**
 * Upload single part via XMLHttpRequest
 */
const uploadPartXHR = (url, chunk, onPartProgress, signal) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload aborted by user'));
      });
    }

    if (xhr.upload && onPartProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onPartProgress(e.loaded);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let etag = xhr.getResponseHeader('ETag');
        if (etag) etag = etag.replace(/"/g, '');
        resolve(etag);
      } else {
        reject(new Error(`Part upload failed with HTTP status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Part upload network error'));
    xhr.ontimeout = () => reject(new Error('Part upload timed out'));
    xhr.send(chunk);
  });
};

/**
 * Upload a large file (100MB to 1GB+) directly from browser to Cloudflare R2 using S3 multipart upload.
 */
export const uploadLargeFileMultipart = async ({
  file,
  orderId = 'general',
  partSize = 10 * 1024 * 1024, // 10MB per part
  onProgress,
  onError,
  onSuccess,
  abortController = new AbortController()
}) => {
  const mimeType = file.type || 'video/mp4';

  // 1. Initiate multipart upload on backend
  const initRes = await apiClient('/uploads/multipart/initiate', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      fileName: file.name,
      mimeType,
      fileSize: file.size
    })
  });

  const { uploadId, key } = initRes;
  const totalParts = Math.ceil(file.size / partSize);
  const parts = [];
  const partLoaded = new Array(totalParts).fill(0);

  const calculateTotalProgress = () => {
    const loaded = partLoaded.reduce((a, b) => a + b, 0);
    const percent = Math.min(99, Math.round((loaded / file.size) * 100));
    if (onProgress) onProgress(percent, loaded, file.size);
  };

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (abortController.signal.aborted) {
        throw new Error('Upload aborted');
      }

      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const chunk = file.slice(start, end);

      // Get presigned URL for this part
      const partUrlRes = await apiClient('/uploads/multipart/part-url', {
        method: 'POST',
        body: JSON.stringify({
          key,
          uploadId,
          partNumber
        })
      });

      // Upload with up to 3 retries per part
      let etag = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          etag = await uploadPartXHR(
            partUrlRes.signedUrl,
            chunk,
            (bytes) => {
              partLoaded[partNumber - 1] = bytes;
              calculateTotalProgress();
            },
            abortController.signal
          );
          partLoaded[partNumber - 1] = chunk.size;
          calculateTotalProgress();
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 3) throw err;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }

      parts.push({
        PartNumber: partNumber,
        ETag: etag
      });
    }

    // 2. Complete multipart upload on backend
    await apiClient('/uploads/multipart/complete', {
      method: 'POST',
      body: JSON.stringify({
        key,
        uploadId,
        parts
      })
    });

    if (onProgress) onProgress(100, file.size, file.size);
    const result = { path: key };
    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    console.error('Multipart upload failed:', err);
    // Cleanup incomplete multipart upload in R2
    try {
      await apiClient('/uploads/multipart/abort', {
        method: 'POST',
        body: JSON.stringify({ key, uploadId })
      });
    } catch (abortErr) {
      console.warn('Failed to abort multipart upload:', abortErr);
    }
    if (onError) onError(err);
    throw err;
  }
};

/**
 * Uploads a file directly to Cloudflare R2 using standard XHR with full progress tracking,
 * or falls back to Supabase signed URL if provider is Supabase.
 */
export const uploadFileToR2OrSupabase = ({
  file,
  signedUrl,
  contentType,
  provider = 'r2',
  path,
  token,
  bucket = 'order-videos',
  onProgress,
  onError,
  onSuccess
}) => {
  return new Promise((resolve, reject) => {
    if (provider === 'r2' || (signedUrl && token === 'r2')) {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100, file.size, file.size);
          const result = { path };
          if (onSuccess) onSuccess(result);
          resolve(result);
        } else {
          const err = new Error(`Direct R2 upload failed with HTTP status ${xhr.status}`);
          if (onError) onError(err);
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Direct upload network error. Please check your internet connection.');
        if (onError) onError(err);
        reject(err);
      };

      xhr.ontimeout = () => {
        const err = new Error('Upload timed out. Please retry.');
        if (onError) onError(err);
        reject(err);
      };

      xhr.send(file);
      return;
    }

    // Fallback: Supabase Storage direct upload
    supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, file)
      .then(({ data, error }) => {
        if (error) {
          const err = new Error(error.message || 'Direct upload failed');
          if (onError) onError(err);
          reject(err);
        } else {
          if (onProgress) onProgress(100);
          const result = { path };
          if (onSuccess) onSuccess(result);
          resolve(result);
        }
      })
      .catch((err) => {
        if (onError) onError(err);
        reject(err);
      });
  });
};

export const uploadVideoDirect = async ({
  file,
  path,
  token,
  signedUrl,
  provider = 'r2',
  bucket = 'order-videos',
  orderId = 'general',
  onProgress,
  onError,
  onSuccess
}) => {
  const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB: use multipart upload for 50MB to 1GB+ files

  if (file.size > MULTIPART_THRESHOLD && provider === 'r2') {
    return uploadLargeFileMultipart({
      file,
      orderId,
      onProgress,
      onError,
      onSuccess
    });
  }

  return uploadFileToR2OrSupabase({
    file,
    signedUrl,
    contentType: file.type || 'video/mp4',
    provider,
    path,
    token,
    bucket,
    onProgress,
    onError,
    onSuccess
  });
};
