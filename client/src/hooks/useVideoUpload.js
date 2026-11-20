import { useState, useRef, useCallback } from 'react';
import { requestVideoUploadUrl, validateVideoFile, uploadVideoDirect } from '../utils/videoUploader';

export const useVideoUpload = ({ maxMb = 2048, orderId = null, onUploadComplete } = {}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedPath, setUploadedPath] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const signDataRef = useRef(null);

  const selectFile = useCallback((selectedFile) => {
    setError(null);
    setProgress(0);
    setUploadedPath(null);
    setIsPaused(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    try {
      validateVideoFile(selectedFile, maxMb);
      setFile(selectedFile);
    } catch (err) {
      setError(err.message);
      setFile(null);
    }
  }, [maxMb]);

  const startUpload = useCallback(async (targetOrderId = orderId) => {
    if (!file) {
      setError('Please select a video file first.');
      return null;
    }

    setError(null);
    setUploading(true);
    setProgress(2);
    setIsPaused(false);

    try {
      validateVideoFile(file, maxMb);

      let signData = signDataRef.current;
      if (!signData) {
        signData = await requestVideoUploadUrl({
          orderId: targetOrderId,
          file,
          maxMb
        });
        signDataRef.current = signData;
      }

      await uploadVideoDirect({
        file,
        path: signData.path,
        token: signData.token,
        signedUrl: signData.signedUrl,
        provider: signData.provider || 'r2',
        bucket: signData.bucket || 'order-videos',
        onProgress: (percent) => {
          setProgress(percent);
        }
      });

      setProgress(100);
      setUploading(false);
      setUploadedPath(signData.path);
      signDataRef.current = null;

      if (onUploadComplete) {
        onUploadComplete({
          path: signData.path,
          name: file.name,
          size: file.size
        });
      }

      return { path: signData.path, name: file.name };
    } catch (err) {
      console.error('Upload process failed:', err);
      setError(err.message || 'Video upload failed');
      setUploading(false);
      throw err;
    }
  }, [file, maxMb, orderId, onUploadComplete]);

  const cancelUpload = useCallback(() => {
    setUploading(false);
    setIsPaused(true);
  }, []);

  const resumeUpload = useCallback(() => {
    startUpload();
  }, [startUpload]);

  const reset = useCallback(() => {
    signDataRef.current = null;
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedPath(null);
    setIsPaused(false);
  }, []);

  return {
    file,
    uploading,
    progress,
    error,
    uploadedPath,
    isPaused,
    selectFile,
    startUpload,
    cancelUpload,
    resumeUpload,
    reset
  };
};
