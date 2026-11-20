import React, { useRef } from 'react';
import { Film, Upload, X, Pause, Play, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export const VideoUploader = ({
  uploadState,
  onFileSelect,
  label = 'Select Video File (MP4, MOV, WEBM, MKV)',
  maxMb = 50,
  disabled = false
}) => {
  const fileInputRef = useRef(null);
  const {
    file,
    uploading,
    progress,
    error,
    uploadedPath,
    isPaused,
    cancelUpload,
    resumeUpload,
    reset
  } = uploadState;

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      onFileSelect(selected);
    }
  };

  return (
    <div className="w-full space-y-3">
      {label && <label className="form-label">{label}</label>}

      {!file && !uploadedPath && (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`glass-panel border-dashed p-6 text-center cursor-pointer transition-all hover:bg-white/10 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <Film className="w-8 h-8 text-orange-400" />
            <span className="font-heading font-bold text-sm text-white">
              Click to choose a video file
            </span>
            <span className="text-xs text-white/50">
              Direct-to-storage upload • MP4, MOV, WEBM, MKV (Up to {maxMb} MB)
            </span>
          </div>
        </div>
      )}

      {file && (
        <div className="p-4 glass-panel rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Film className="w-5 h-5 text-orange-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-heading font-bold text-white truncate">{file.name}</p>
                <p className="text-[10px] text-white/50 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'video'}
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                type="button"
                onClick={reset}
                className="text-white/40 hover:text-red-400 p-1 shrink-0 transition-colors"
                title="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(uploading || progress > 0) && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/70 font-mono">
                  {uploadedPath
                    ? 'Uploaded directly to storage'
                    : isPaused
                    ? 'Upload paused'
                    : file.size > 6 * 1024 * 1024
                    ? 'Resumable TUS direct upload...'
                    : 'Direct upload in progress...'}
                </span>
                <span className="font-bold font-mono text-orange-400">{progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${isPaused ? 'bg-yellow-500' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {uploading && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelUpload}
                className="text-xs py-1 px-3"
              >
                <Pause className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            )}

            {isPaused && !uploadedPath && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={resumeUpload}
                className="text-xs py-1 px-3"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Resume Upload
              </Button>
            )}

            {uploadedPath && (
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready for submission</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
