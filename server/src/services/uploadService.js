const supabase = require('../config/supabase');
const env = require('../config/env');
const r2Service = require('./r2Service');

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska'
];

const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv'];

const isR2Configured = () => {
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    (env.R2_ENDPOINT || env.R2_ACCOUNT_ID)
  );
};

const validateVideoParams = ({ fileName, mimeType, fileSize, userRole }) => {
  if (!['order_taker', 'editor', 'admin'].includes(userRole)) {
    const error = new Error('Unauthorized role for video upload');
    error.statusCode = 403;
    throw error;
  }

  if (!fileName || typeof fileName !== 'string') {
    const error = new Error('fileName is required');
    error.statusCode = 400;
    throw error;
  }

  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);

  if (!isAllowedExt || !isAllowedMime) {
    const error = new Error('Invalid video format. Allowed formats: mp4, mov, webm, mkv');
    error.statusCode = 400;
    throw error;
  }

  const maxMb = Number(env.MAX_VIDEO_MB) || 2048;
  const maxBytes = maxMb * 1024 * 1024;
  if (fileSize && Number(fileSize) > maxBytes) {
    const error = new Error(`File size exceeds maximum limit of ${maxMb} MB`);
    error.statusCode = 400;
    throw error;
  }
};

const createVideoSignedUploadUrl = async ({ orderId, fileName, mimeType, fileSize, userRole }) => {
  validateVideoParams({ fileName, mimeType, fileSize, userRole });

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeOrderId = orderId || 'general';
  const objectKey = `videos/${safeOrderId}/${Date.now()}-${sanitizedName}`;

  // Use Cloudflare R2 when configured
  if (isR2Configured()) {
    try {
      const { signedUrl, bucket } = await r2Service.createUploadUrl({
        key: objectKey,
        contentType: mimeType || 'video/mp4',
        expiresIn: 3600
      });

      return {
        path: objectKey,
        token: 'r2',
        signedUrl,
        provider: 'r2',
        bucket
      };
    } catch (r2Err) {
      console.error('R2 Video Signed URL generation failed, falling back to Supabase:', r2Err);
    }
  }

  // Fallback to Supabase Storage if R2 is not configured
  const { data, error } = await supabase.storage
    .from('order-videos')
    .createSignedUploadUrl(objectKey);

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 500;
    throw err;
  }

  return {
    path: objectKey,
    token: data.token,
    signedUrl: data.signedUrl,
    provider: 'supabase',
    bucket: 'order-videos'
  };
};

const createVideoSignedReadUrl = async (path, expiresIn = 3600) => {
  if (!path) {
    const error = new Error('Storage path is required');
    error.statusCode = 400;
    throw error;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (isR2Configured()) {
    try {
      const signedUrl = await r2Service.getFileUrl({
        key: path,
        expiresIn
      });
      return signedUrl;
    } catch (r2Err) {
      console.warn('R2 read URL generation failed, trying Supabase storage fallback:', r2Err);
    }
  }

  const { data, error } = await supabase.storage
    .from('order-videos')
    .createSignedUrl(path, expiresIn);

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 500;
    throw err;
  }

  return data.signedUrl;
};

/**
 * Multipart Upload Services for 1GB+ large files
 */
const initiateMultipartUpload = async ({ orderId, fileName, mimeType, fileSize, userRole }) => {
  validateVideoParams({ fileName, mimeType, fileSize, userRole });

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeOrderId = orderId || 'general';
  const objectKey = `videos/${safeOrderId}/${Date.now()}-${sanitizedName}`;

  if (!isR2Configured()) {
    const error = new Error('Multipart upload requires Cloudflare R2 configuration');
    error.statusCode = 500;
    throw error;
  }

  const result = await r2Service.createMultipartUpload({
    key: objectKey,
    contentType: mimeType || 'video/mp4'
  });

  return {
    uploadId: result.uploadId,
    key: objectKey,
    bucket: result.bucket
  };
};

const getMultipartPartUrl = async ({ key, uploadId, partNumber }) => {
  if (!key || !uploadId || !partNumber) {
    const error = new Error('key, uploadId, and partNumber are required');
    error.statusCode = 400;
    throw error;
  }

  const signedUrl = await r2Service.getMultipartPartUrl({
    key,
    uploadId,
    partNumber: Number(partNumber),
    expiresIn: 3600
  });

  return { signedUrl, partNumber: Number(partNumber) };
};

const completeMultipartUpload = async ({ key, uploadId, parts }) => {
  if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    const error = new Error('key, uploadId, and parts array are required');
    error.statusCode = 400;
    throw error;
  }

  await r2Service.completeMultipartUpload({
    key,
    uploadId,
    parts
  });

  return { success: true, key };
};

const abortMultipartUpload = async ({ key, uploadId }) => {
  if (!key || !uploadId) {
    const error = new Error('key and uploadId are required');
    error.statusCode = 400;
    throw error;
  }

  await r2Service.abortMultipartUpload({
    key,
    uploadId
  });

  return { success: true };
};

module.exports = {
  createVideoSignedUploadUrl,
  createVideoSignedReadUrl,
  initiateMultipartUpload,
  getMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  isR2Configured,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};
