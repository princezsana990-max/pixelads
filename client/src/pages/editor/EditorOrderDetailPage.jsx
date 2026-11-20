import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Film, Upload, Download, AlertCircle } from 'lucide-react';
import { getOrderByIdApi, submitWorkApi } from '../../api/orders';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { OrderChat } from '../../components/chat/OrderChat';
import { formatDate, formatTime, formatCleanNotes } from '../../utils/formatters';
import { VideoUploader } from '../../components/shared/VideoUploader';
import { useVideoUpload } from '../../hooks/useVideoUpload';

export const EditorOrderDetailPage = () => {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const videoUpload = useVideoUpload({
    orderId: id,
    maxMb: 50
  });

  const fetchOrder = async () => {
    try {
      const data = await getOrderByIdApi(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!videoUpload.file && !videoUpload.uploadedPath) return;

    setSubmitting(true);

    try {
      let uploadResultPath = videoUpload.uploadedPath;

      if (!uploadResultPath) {
        const result = await videoUpload.startUpload(id);
        uploadResultPath = result.path;
      }

      await submitWorkApi(id, {
        video_url: uploadResultPath,
        video_name: videoUpload.file?.name || 'edited_video.mp4',
        notes: submissionNotes.trim() || undefined
      });

      videoUpload.reset();
      setSubmissionNotes('');
      toast.success('Edited video submitted successfully for review!');
      await fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to submit edited work');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto p-6 glass-card border-red-500/30 text-center">
        <p className="text-red-400 text-sm font-semibold">{error || 'Order not found'}</p>
        <Link to="/editor/dashboard" className="inline-block mt-4">
          <Button variant="secondary" size="sm">Back to Assignments</Button>
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === 'completed';
  const editedFiles = (order.order_files || []).filter((f) => f.file_type === 'edited_video');
  const sourceFiles = (order.order_files || []).filter((f) => f.file_type !== 'edited_video');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/editor/dashboard" className="text-white/60 hover:text-white p-2 glass-panel rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-2xl text-white">
                {order.order_code}: {order.project_name}
              </h1>
              <Badge variant={order.status}>{order.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Order Taker: {order.order_taker?.name} ({order.order_taker?.employee_id}) | Assigned {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {order.status === 'revision' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-heading font-bold text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Client Requested Revisions. Check notes & chat below.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          {!isCompleted ? (
            <Card>
              <CardHeader>
                <CardTitle>Submit Completed / Revised Video</CardTitle>
              </CardHeader>

              <form onSubmit={handleSubmitWork} className="space-y-4">
                <VideoUploader
                  uploadState={videoUpload}
                  onFileSelect={videoUpload.selectFile}
                  label="Select Finished Video File (MP4, MOV, WEBM, MKV) *"
                  disabled={submitting}
                />

                <Textarea
                  label="Submission Notes (Optional)"
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Cut version 2 with corrected colour grading and requested music track..."
                  rows={3}
                  disabled={submitting || videoUpload.uploading}
                />

                <Button
                  type="submit"
                  className="w-full"
                  loading={submitting || videoUpload.uploading}
                  disabled={!videoUpload.file && !videoUpload.uploadedPath}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {videoUpload.uploadedPath ? 'Submit Video Work' : 'Upload & Submit Work'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-center text-xs font-heading font-bold text-orange-400 uppercase">
                This project has been approved and marked complete.
              </div>
            </Card>
          )}

          {editedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submitted Cuts History</CardTitle>
              </CardHeader>
              <div className="space-y-2.5">
                {editedFiles.map((cut) => (
                  <div
                    key={cut.id}
                    className="p-3 glass-panel rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Film className="w-4 h-4 text-orange-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{cut.file_name}</div>
                        <div className="text-[10px] text-white/40">{formatDate(cut.created_at)} at {formatTime(cut.created_at)}</div>
                      </div>
                    </div>
                    <a
                      href={cut.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button variant="secondary" size="sm" className="px-2.5 py-1 text-xs shrink-0">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Project Narration Script & Assets</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Narration Script
                </label>
                <div className="p-3.5 glass-panel rounded-lg text-xs text-white/80 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {order.script}
                </div>
              </div>

              {formatCleanNotes(order.clean_notes || order.notes) && (
                <div>
                  <label className="form-label">
                    Special Remarks / Instructions
                  </label>
                  <div className="p-3 glass-panel rounded-lg text-xs text-white/80 whitespace-pre-wrap">
                    {formatCleanNotes(order.clean_notes || order.notes)}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">
                  Source Footage & Pictures ({sourceFiles.length})
                </label>
                <div className="space-y-2">
                  {sourceFiles.map((sf) => (
                    <div
                      key={sf.id}
                      className="flex items-center justify-between p-2.5 glass-panel rounded-lg text-xs"
                    >
                      <a
                        href={sf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-orange-400 hover:underline font-medium"
                      >
                        {sf.file_name}
                      </a>
                      <a
                        href={sf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="text-white/60 hover:text-white font-heading font-bold text-[11px] uppercase ml-2 shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6">
          <OrderChat orderId={id} isLocked={isCompleted} />
        </div>
      </div>
    </div>
  );
};
