import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { getSignedUploadUrlApi } from '../../api/settings';
import { uploadFileToR2OrSupabase } from '../../utils/videoUploader';
import { formatDuration } from '../../utils/formatters';

export const VoiceRecorder = ({ onSend, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    setUploading(true);

    try {
      const fileName = `voice_${Date.now()}.webm`;
      const signData = await getSignedUploadUrlApi(fileName, 'chat-media', 'audio/webm');

      await uploadFileToR2OrSupabase({
        file: audioBlob,
        path: signData.path,
        token: signData.token,
        signedUrl: signData.signedUrl,
        provider: signData.provider || 'r2',
        bucket: 'chat-media',
        contentType: 'audio/webm'
      });

      await onSend({
        message_type: 'voice',
        audio_url: signData.publicUrl || signData.path,
        audio_duration: recordingTime
      });

      setAudioBlob(null);
      setRecordingTime(0);
    } catch (err) {
    } finally {
      setUploading(false);
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border-1.5 border-red-600 rounded-md">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
        <span className="text-xs font-mono font-bold text-red-600">
          {formatDuration(recordingTime)}
        </span>
        <button
          type="button"
          onClick={stopRecording}
          className="ml-2 text-black hover:text-red-700 p-1"
          title="Stop Recording"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
      </div>
    );
  }

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 border-1.5 border-black rounded-md">
        <span className="text-xs font-mono font-bold text-black">
          Voice Note ({formatDuration(recordingTime)})
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          disabled={uploading}
          className="text-neutral-500 hover:text-red-600 p-1"
          title="Discard"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={sendVoiceNote}
          disabled={uploading}
          className="text-brand-orange hover:text-brand-orange-hover p-1"
          title="Send Voice Note"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="p-2 text-neutral-700 hover:text-brand-orange border-1.5 border-black rounded-md hover:bg-neutral-50 disabled:opacity-50 transition-colors"
      title="Record Voice Message"
    >
      <Mic className="w-4 h-4" />
    </button>
  );
};
