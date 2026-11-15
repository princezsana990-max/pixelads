import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, RefreshCw, Lock, Film, AlertTriangle } from 'lucide-react';
import { getOrderByIdApi, requestRevisionApi, approveWorkApi, finalizeOrderApi } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { OrderChat } from '../../components/chat/OrderChat';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

export const OrderReviewPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isApprovedLocal, setIsApprovedLocal] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await getOrderByIdApi(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) return;
    setActionLoading(true);
    try {
      await requestRevisionApi(id, revisionNotes.trim());
      setRevisionModalOpen(false);
      setRevisionNotes('');
      toast.success('Revision request sent to editor');
      await fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to request revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveWorkApi(id);
      setIsApprovedLocal(true);
      toast.success('Work approved');
      await fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to approve work');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (Number(order.pending_amount) > 0) {
      toast.warning(`Cannot close order. Remaining pending balance: ${formatCurrency(order.pending_amount)}.`);
      return;
    }

    setActionLoading(true);
    try {
      await finalizeOrderApi(id);
      toast.success('Order finalized and completed');
      await fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize order');
    } finally {
      setActionLoading(false);
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
        <Link to="/order-taker/dashboard" className="inline-block mt-4">
          <Button variant="secondary" size="sm">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === 'completed';
  const editedFiles = (order.order_files || []).filter((f) => f.file_type === 'edited_video');
  const sourceFiles = (order.order_files || []).filter((f) => f.file_type !== 'edited_video');
  const canFinalize = user?.role === 'order_taker' && (isApprovedLocal || order.status === 'in_review') && !isCompleted;
  const hasPendingBalance = Number(order.pending_amount) > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/order-taker/dashboard" className="text-white/60 hover:text-white p-2 glass-panel rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <h1 className="font-heading font-black text-2xl text-white">
                Review & Chat: {order.order_code}
              </h1>
              <Badge variant={order.status}>{order.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Project: {order.project_name} | Created {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {user?.role === 'order_taker' && !isCompleted && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRevisionModalOpen(true)}
                disabled={actionLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Request Revision
              </Button>

              {!isApprovedLocal && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5 text-orange-400" />
                  Approve Work
                </Button>
              )}

              {canFinalize && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFinalize}
                  loading={actionLoading}
                  disabled={hasPendingBalance}
                  title={hasPendingBalance ? `Pending balance: ${formatCurrency(order.pending_amount)} must be paid first.` : 'Finalize & Close'}
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  Finalize & Complete Order
                </Button>
              )}
            </>
          )}

          {isCompleted && (
            <Badge variant="completed">
              Order Completed & Locked
            </Badge>
          )}
        </div>
      </div>

      {hasPendingBalance && !isCompleted && (
        <div className="p-4 rounded-xl glass-card border-yellow-500/30 bg-yellow-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="text-sm">
              <span className="font-heading font-bold text-yellow-400">Payment Incomplete: </span>
              <span className="text-white/80">
                This order has an outstanding pending balance of <strong className="text-yellow-400">{formatCurrency(order.pending_amount)}</strong>.
                Per policy, orders cannot be closed until fully paid.
              </span>
            </div>
          </div>
          <Link to={`/order-taker/orders/${order.id}/invoice`}>
            <Button variant="secondary" size="sm" className="shrink-0">
              View Invoice
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submitted Edited Work</CardTitle>
            </CardHeader>
            {editedFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/40 glass-panel rounded-lg">
                The editor has not yet submitted the final edited video.
              </div>
            ) : (
              <div className="space-y-3">
                {editedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 glass-panel rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Film className="w-5 h-5 text-orange-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-heading font-bold text-white truncate">
                          {file.file_name}
                        </div>
                        <div className="text-[10px] text-white/40">
                          Submitted on {formatDate(file.created_at)} at {formatTime(file.created_at)}
                        </div>
                      </div>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button size="sm" className="px-3 py-1 text-xs shrink-0">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download Video
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Script & Source Files</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Full Narration Script
                </label>
                <div className="p-3.5 glass-panel rounded-lg text-xs text-white/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {order.script}
                </div>
              </div>

              {order.notes && (
                <div>
                  <label className="form-label">
                    Special Remarks / Instructions
                  </label>
                  <div className="p-3 glass-panel rounded-lg text-xs text-white/70">
                    {order.notes}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">
                  Source Videos & Pictures ({sourceFiles.length})
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
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 border border-white/20 rounded bg-white/5 text-white/60 shrink-0">
                        {sf.file_type}
                      </span>
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

      <Modal
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Request Order Revision"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevisionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRequestRevision}
              loading={actionLoading}
            >
              Send Revision Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-white/60">
            Specify the corrections needed. This will notify the editor and post your request to the order chat.
          </p>
          <Textarea
            label="Correction Notes"
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="e.g. Please change background music at 0:45, re-align subtitle typography, remove transition effect..."
            rows={5}
            required
          />
        </div>
      </Modal>
    </div>
  );
};
