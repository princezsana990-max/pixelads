import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

export const AudioPlayer = ({ src, initialDuration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
      setLoading(false);
    };

    const onTimeUpdate = () => setCurrentTime(Math.round(audio.currentTime));
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onError = () => { setError(true); setLoading(false); setIsPlaying(false); };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => { setLoading(false); setIsPlaying(true); };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || error) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setError(true));
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
        <span>Voice message unavailable</span>
        {src && <a href={src} target="_blank" rel="noopener noreferrer" className="underline ml-auto text-orange-400">Download</a>}
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl glass-panel max-w-xs w-full">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        disabled={loading}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
        style={{ background: 'var(--orange)', boxShadow: 'var(--shadow-orange)' }}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-white animate-spin-slow" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 text-white" />
        ) : (
          <Play className="w-3.5 h-3.5 text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--orange) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
            accentColor: 'var(--orange)',
          }}
        />
        <div className="flex justify-between text-[10px] font-mono text-white/50">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};
