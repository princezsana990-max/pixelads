import React, { useState, useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getSignedUploadUrlApi } from '../../api/settings';
import { supabase } from '../../utils/supabaseClient';

export const DirectUploader = ({
  files = [],
  onChange,
  bucket = 'order-files',
  acceptedTypes = '*/*',
  maxFiles = 5000,
  label = 'Upload Media Files (Videos, Pictures, Assets)'
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setError(null);

    try {
      const uploadedResults = [];
      const total = selectedFiles.length;
      setUploadStats({ current: 0, total });

      for (let i = 0; i < total; i++) {
        const file = selectedFiles[i];
        setUploadStats({ current: i + 1, total });

        const signData = await getSignedUploadUrlApi(file.name, bucket);
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .uploadToSignedUrl(signData.path, signData.token, file);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const isVideo = file.type.startsWith('video') || /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v)$/i.test(file.name);
        const isImage = file.type.startsWith('image') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff|psd|ai)$/i.test(file.name);
        const fileType = isVideo ? 'video' : isImage ? 'image' : 'attachment';

        uploadedResults.push({
          file_name: file.name,
          file_type: fileType,
          file_url: signData.publicUrl
        });

        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      onChange([...files, ...uploadedResults]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStats({ current: 0, total: 0 });
    }
  };

  const handleRemove = (index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="form-label">
          {label}
        </label>
        <span className="text-xs text-white/40">
          {files.length} file{files.length === 1 ? '' : 's'} attached (Any size & format supported)
        </span>
      </div>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`glass-panel border-dashed p-6 text-center cursor-pointer transition-all hover:bg-white/10 ${
          uploading ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <Loader2 className="w-7 h-7 text-orange-400 animate-spin-slow" />
          ) : (
            <Upload className="w-7 h-7 text-orange-400" />
          )}
          <span className="font-heading font-bold text-sm text-white">
            {uploading
              ? `Uploading ${uploadStats.current}/${uploadStats.total} files (${uploadProgress}%)...`
              : 'Click or drop files to upload (Videos, Pictures, Audios, Docs)'}
          </span>
          <span className="text-xs text-white/40">
            Upload any quantity (10, 50, 200, 2000+), any size, and any format (MP4, MOV, PNG, JPG, PSD, etc.)
          </span>
        </div>

        {uploading && uploadProgress > 0 && (
          <div className="mt-4 max-w-xs mx-auto progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 glass-panel rounded-lg text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {f.file_type === 'video' || f.file_type === 'edited_video' ? (
                  <Film className="w-4 h-4 text-orange-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-orange-400 shrink-0" />
                )}
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-orange-400 truncate underline"
                >
                  {f.file_name}
                </a>
                <span className="text-white/40 text-[10px] uppercase font-heading px-1.5 py-0.5 border border-white/10 rounded bg-white/5 shrink-0">
                  {f.file_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-white/40 hover:text-red-400 p-1 shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
