import React, { useState, useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, Loader2, Link as LinkIcon, Plus } from 'lucide-react';
import { getSignedUploadUrlApi } from '../../api/settings';
import { requestVideoUploadUrl, uploadVideoDirect, uploadFileToR2OrSupabase } from '../../utils/videoUploader';

export const DirectUploader = ({
  files = [],
  onChange,
  bucket = 'order-files',
  acceptedTypes = '*/*',
  maxFiles = 5000,
  label = 'Upload Media Files (Videos, Pictures, Assets)'
}) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'link'
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState('video');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!linkInput.trim()) {
      setError('Please provide a valid link (WeTransfer, Google Drive, Mega, etc.)');
      return;
    }

    try {
      new URL(linkInput.trim());
    } catch {
      setError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    const title = linkTitle.trim() || `External Link (${new URL(linkInput.trim()).hostname})`;
    const newFile = {
      file_name: title,
      file_type: linkType,
      file_url: linkInput.trim()
    };

    onChange([...files, newFile]);
    setLinkInput('');
    setLinkTitle('');
    setError(null);
  };

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

        const isVideo = file.type.startsWith('video') || /\.(mp4|mov|avi|mkv|wmv|flv|webm|m4v)$/i.test(file.name);
        const isImage = file.type.startsWith('image') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff|psd|ai)$/i.test(file.name);

        if (isVideo) {
          const videoSignData = await requestVideoUploadUrl({
            orderId: 'new-order',
            file
          });

          await uploadVideoDirect({
            file,
            path: videoSignData.path,
            token: videoSignData.token,
            signedUrl: videoSignData.signedUrl,
            provider: videoSignData.provider || 'r2',
            bucket: videoSignData.bucket || 'order-videos',
            onProgress: (p) => {
              const fileShare = 100 / total;
              const currentBase = i * fileShare;
              setUploadProgress(Math.round(currentBase + (p * fileShare) / 100));
            }
          });

          uploadedResults.push({
            file_name: file.name,
            file_type: 'video',
            file_url: videoSignData.path
          });
        } else {
          const signData = await getSignedUploadUrlApi(file.name, bucket, file.type);

          await uploadFileToR2OrSupabase({
            file,
            path: signData.path,
            token: signData.token,
            signedUrl: signData.signedUrl,
            provider: signData.provider || 'r2',
            bucket,
            contentType: file.type || 'application/octet-stream',
            onProgress: (p) => {
              const fileShare = 100 / total;
              const currentBase = i * fileShare;
              setUploadProgress(Math.round(currentBase + (p * fileShare) / 100));
            }
          });

          const fileType = isImage ? 'image' : 'attachment';

          uploadedResults.push({
            file_name: file.name,
            file_type: fileType,
            file_url: signData.publicUrl || signData.path
          });
        }

        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      onChange([...files, ...uploadedResults]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('File upload failed:', err);
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
        <label className="form-label mb-0">
          {label}
        </label>
        <span className="text-xs text-white/40">
          {files.length} file{files.length === 1 ? '' : 's'} attached
        </span>
      </div>

      {/* Tabs between Upload & Link */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Direct File Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-colors ${
            activeTab === 'link'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          External Link (WeTransfer / Drive / Mega)
        </button>
      </div>

      {activeTab === 'upload' ? (
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
              Direct upload for large files up to 2GB (MP4, MOV, WEBM, MKV, Images)
            </span>
          </div>

          {uploading && uploadProgress > 0 && (
            <div className="mt-4 max-w-xs mx-auto progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-4 space-y-3 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-xs text-orange-400/90 font-medium">
            <LinkIcon className="w-4 h-4 shrink-0" />
            <span>Heavy 1GB+ files? Upload on WeTransfer / Google Drive / Dropbox & paste link here:</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-6">
              <input
                type="url"
                placeholder="https://we.tl/t-XXXXX or Google Drive link"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="form-input text-xs w-full"
              />
            </div>
            <div className="md:col-span-3">
              <input
                type="text"
                placeholder="Title (e.g. Raw Footage / 1GB Video)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="form-input text-xs w-full"
              />
            </div>
            <div className="md:col-span-2">
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="form-select text-xs w-full"
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="attachment">Doc / Archive</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={handleAddLink}
                className="btn-primary w-full py-2 px-3 text-xs flex items-center justify-center gap-1 h-full"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="font-medium text-white truncate max-w-xs">
                  {f.file_name}
                </span>
                {f.file_url && f.file_url.startsWith('http') && (
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 hover:underline text-[11px] truncate max-w-[150px]"
                  >
                    (Open Link)
                  </a>
                )}
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
