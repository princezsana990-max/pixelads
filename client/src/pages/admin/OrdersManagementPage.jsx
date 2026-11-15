import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Eye, UserCheck, MessageSquare, Download, Edit2, Trash2,
  RotateCcw, Plus, CreditCard, ExternalLink, CheckCircle, Lock, Power, Calendar, Clock
} from 'lucide-react';
import {
  getOrdersApi, assignOrderApi, updateOrderApi, deleteOrderApi,
  recoverOrderApi, finalizeOrderApi, getOrderByIdApi, updateAdStatusApi
} from '../../api/orders';
import { getUsersApi } from '../../api/users';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import { OrderChat } from '../../components/chat/OrderChat';
import { generateInvoicePdf } from '../../utils/invoicePdf';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const OrdersManagementPage = () => {
  const toast = useToast();
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [showDeleted, setShowDeleted] = useState(false);

  const [editors, setEditors] = useState([]);
  const [orderTakers, setOrderTakers] = useState([]);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedEditorId, setSelectedEditorId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    order_taker_id: '', project_name: '', script: '', notes: '',
    customer_name: '', customer_phone: '', customer_email: '',
    total_amount: '', advance_amount: '', status: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAction, setPaymentAction] = useState('add');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [adStatusLoading, setAdStatusLoading] = useState(null);

  const [adDaysModalOpen, setAdDaysModalOpen] = useState(false);
  const [selectedAdOrder, setSelectedAdOrder] = useState(null);
  const [adDaysForm, setAdDaysForm] = useState({
    ad_status: 'deactive',
    active_days: 0,
    month_days: 30,
    daily_records: []
  });
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEntryStatus, setNewEntryStatus] = useState('present');
  const [newEntryNote, setNewEntryNote] = useState('');
  const [adDaysLoading, setAdDaysLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrdersApi({
        page,
        limit: 31,
        status: status || undefined,
        search: debouncedSearch || undefined,
        isDeleted: showDeleted
      });
      setOrders(result.orders || []);
      setPagination(result.pagination || { total: 0, totalPages: 1 });
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch, showDeleted]);

  const fetchStaff = async () => {
    try {
      const edRes = await getUsersApi({ role: 'editor', limit: 100 });
      setEditors(edRes.users || []);
      const otRes = await getUsersApi({ role: 'order_taker', limit: 100 });
      setOrderTakers(otRes.users || []);
    } catch {
    }
  };

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchStaff(); }, []);

  const handleAssign = async () => {
    if (!selectedOrder || !selectedEditorId) return;
    setAssignLoading(true);
    try {
      await assignOrderApi(selectedOrder.id, selectedEditorId);
      toast.success(`Order ${selectedOrder.order_code} assigned successfully`);
      setAssignModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleOpenEdit = (order) => {
    setSelectedOrder(order);
    setEditForm({
      order_taker_id: order.order_taker?.id || '',
      project_name: order.project_name || '',
      script: order.script || '',
      notes: order.notes === '__DELETED_ARCHIVE__' ? '' : (order.notes || ''),
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
      total_amount: order.total_amount || '',
      advance_amount: order.advance_amount || '',
      status: order.status || 'pending'
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setEditLoading(true);
    try {
      await updateOrderApi(selectedOrder.id, {
        order_taker_id: editForm.order_taker_id || undefined,
        project_name: editForm.project_name,
        script: editForm.script,
        notes: editForm.notes,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email || undefined,
        total_amount: Number(editForm.total_amount),
        advance_amount: Number(editForm.advance_amount),
        status: editForm.status
      });
      toast.success('Order updated successfully by Admin');
      setEditModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Delete order ${order.order_code}? Admin can restore it anytime.`)) return;
    try {
      await deleteOrderApi(order.id);
      toast.success(`Order ${order.order_code} deleted`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to delete order');
    }
  };

  const handleRecover = async (order) => {
    try {
      await recoverOrderApi(order.id);
      toast.success(`Order ${order.order_code} restored successfully!`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to recover order');
    }
  };

  const handleOpenPayment = (order) => {
    setSelectedOrder(order);
    setPaymentAmount('');
    setPaymentAction('add');
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setPaymentLoading(true);
    try {
      const curAdv = Number(selectedOrder.advance_amount) || 0;
      const numAmt = Number(paymentAmount) || 0;
      let newAdv = curAdv;
      if (paymentAction === 'add') newAdv = curAdv + numAmt;
      else if (paymentAction === 'set') newAdv = numAmt;
      else if (paymentAction === 'reset') newAdv = 0;

      await updateOrderApi(selectedOrder.id, {
        advance_amount: newAdv
      });
      toast.success(`Payment updated for ${selectedOrder.order_code}: New received Rs. ${newAdv.toLocaleString()}`);
      setPaymentModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const fullOrder = await getOrderByIdApi(order.id);
      const doc = generateInvoicePdf(fullOrder, settings);
      doc.save(`Invoice_${order.order_code}.pdf`);
      toast.success(`Invoice for ${order.order_code} downloaded`);
    } catch (err) {
      toast.error('Failed to download invoice PDF');
    }
  };

  const handleFinalize = async (order) => {
    try {
      await finalizeOrderApi(order.id);
      toast.success(`Order ${order.order_code} marked completed!`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize order');
    }
  };

  const handleToggleAdStatus = async (order) => {
    const currentStatus = order.ad_status || 'deactive';
    const newStatus = currentStatus === 'active' ? 'deactive' : 'active';
    setAdStatusLoading(order.id);
    try {
      await updateAdStatusApi(order.id, { ad_status: newStatus });
      toast.success(`Ad status for ${order.order_code}: ${newStatus.toUpperCase()}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update ad status');
    } finally {
      setAdStatusLoading(null);
    }
  };

  const handleOpenAdDays = (order) => {
    setSelectedAdOrder(order);
    const present = order.ad_present_days ?? (order.ad_active_days || 0);
    const total = order.ad_month_days || 30;
    const records = Array.isArray(order.ad_daily_records) ? order.ad_daily_records : [];
    setAdDaysForm({
      ad_status: order.ad_status || 'deactive',
      active_days: present,
      month_days: total,
      daily_records: records
    });
    setNewEntryDate(new Date().toISOString().slice(0, 10));
    setNewEntryStatus('present');
    setNewEntryNote('');
    setAdDaysModalOpen(true);
  };

  const handleAddDailyEntry = () => {
    if (!newEntryDate) return;
    const existsIndex = adDaysForm.daily_records.findIndex(r => r.date === newEntryDate);
    let updated;
    if (existsIndex >= 0) {
      updated = [...adDaysForm.daily_records];
      updated[existsIndex] = { date: newEntryDate, status: newEntryStatus, note: newEntryNote };
    } else {
      updated = [{ date: newEntryDate, status: newEntryStatus, note: newEntryNote }, ...adDaysForm.daily_records];
    }
    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
    const newPresent = updated.filter(r => r.status === 'present').length;
    setAdDaysForm(prev => ({
      ...prev,
      daily_records: updated,
      active_days: newPresent
    }));
    setNewEntryNote('');
    toast.success(`Entry added for ${newEntryDate} (${newEntryStatus.toUpperCase()})`);
  };

  const handleDeleteDailyEntry = (dateToDelete) => {
    const updated = adDaysForm.daily_records.filter(r => r.date !== dateToDelete);
    const newPresent = updated.filter(r => r.status === 'present').length;
    setAdDaysForm(prev => ({
      ...prev,
      daily_records: updated,
      active_days: newPresent
    }));
    toast.success(`Entry removed for ${dateToDelete}`);
  };

  const handleToggleDailyRecordStatus = (index) => {
    const updated = [...adDaysForm.daily_records];
    const curr = updated[index];
    const newStatus = curr.status === 'present' ? 'absent' : 'present';
    updated[index] = { ...curr, status: newStatus };
    const newPresent = updated.filter(r => r.status === 'present').length;
    setAdDaysForm(prev => ({
      ...prev,
      daily_records: updated,
      active_days: newPresent
    }));
  };

  const handleSaveAdDays = async (e) => {
    e.preventDefault();
    if (!selectedAdOrder) return;
    setAdDaysLoading(true);
    try {
      await updateAdStatusApi(selectedAdOrder.id, {
        ad_status: adDaysForm.ad_status,
        active_days: Number(adDaysForm.active_days),
        month_days: Number(adDaysForm.month_days),
        daily_records: adDaysForm.daily_records
      });
      toast.success(`Daily attendance and ad schedule saved for ${selectedAdOrder.order_code}`);
      setAdDaysModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update ads schedule');
    } finally {
      setAdDaysLoading(false);
    }
  };

  const columns = [
    {
      key: 'order_code', label: 'Order',
      render: (v) => <span className="font-mono font-bold text-orange-500">{v}</span>
    },
    {
      key: 'created_at', label: 'Date / Time',
      render: (v) => (
        <div>
          <div className="text-xs opacity-80">{formatDate(v)}</div>
          <div className="text-xs opacity-50">{formatTime(v)}</div>
        </div>
      )
    },
    {
      key: 'order_taker_name', label: 'Order Taker',
      render: (_, row) => <span className="text-sm opacity-80">{row.order_taker?.name || '-'}</span>
    },
    {
      key: 'project_name', label: 'Project',
      render: (v) => <span className="font-heading font-semibold">{v}</span>
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <Badge variant={v}>{v}</Badge>
    },
    {
      key: 'ad_status', label: 'Ads Status',
      render: (_, row) => {
        const isActive = row.ad_status === 'active';
        const present = row.ad_present_days ?? (row.ad_active_days || 0);
        const absent = row.ad_absent_days ?? Math.max(0, (row.ad_month_days || 30) - present);
        const total = row.ad_month_days || 30;
        const isLoading = adStatusLoading === row.id;

        return (
          <div className="flex flex-col gap-1 items-start min-w-[135px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleToggleAdStatus(row)}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-full text-xs font-heading font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-green-500/15 text-green-400 border border-green-500/40 hover:bg-green-500/25 shadow-sm'
                    : 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30 hover:bg-zinc-700/50'
                }`}
                title="Click to toggle Active / Deactive"
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span>{isLoading ? 'Updating...' : isActive ? 'Active' : 'Deactive'}</span>
              </button>

              <button
                onClick={() => handleOpenAdDays(row)}
                className="p-1 rounded-lg hover:bg-orange-500/15 text-white/50 hover:text-orange-400 transition-colors"
                title="Daily Attendance & Ad Records"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[11px] font-mono opacity-70">
              <span className="text-green-400 font-bold">{present}P</span>
              <span className="opacity-40"> / </span>
              <span className="text-zinc-400 font-bold">{absent}A</span>
              <span className="opacity-40"> ({total}d)</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'total_amount', label: 'Total',
      render: (v) => <span className="font-heading font-bold">{formatCurrency(v)}</span>
    },
    {
      key: 'advance_amount', label: 'Received',
      render: (v) => <span className="font-heading font-bold text-green-500">{formatCurrency(v)}</span>
    },
    {
      key: 'pending_amount', label: 'Pending',
      render: (v) => <span className={`font-heading font-bold ${Number(v) > 0 ? 'text-yellow-500' : 'opacity-40'}`}>{formatCurrency(v)}</span>
    },
    {
      key: 'id', label: 'Actions',
      width: '160px',
      render: (_, row) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setChatOrder(row); setChatModalOpen(true); }}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-green-400 transition-colors"
            title="Open Live Chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDownloadInvoice(row)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-400 transition-colors"
            title="Download PDF Invoice"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenPayment(row)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-yellow-400 transition-colors"
            title="Manual Payment Entry"
          >
            <CreditCard className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-blue-400 transition-colors"
            title="Edit Order"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {showDeleted ? (
            <button
              onClick={() => handleRecover(row)}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 text-green-400 transition-colors"
              title="Restore / Recover Order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-red-400 transition-colors"
              title="Delete Order"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {row.status !== 'completed' && (
            <button
              onClick={() => handleFinalize(row)}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-400 transition-colors"
              title="Mark Completed"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {['pending', 'assigned'].includes(row.status) && (
            <button
              onClick={() => { setSelectedOrder(row); setSelectedEditorId(''); setAssignModalOpen(true); }}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-400 transition-colors"
              title="Assign Editor"
            >
              <UserCheck className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => { setViewOrder(row); setDetailModalOpen(true); }}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const getOrderRowClass = (row) => {
    const hasActiveEditor = row.assignments?.some(a => a.is_active && a.editor);
    if (hasActiveEditor) return 'row-assigned';
    return 'row-unassigned';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">
            {showDeleted ? 'Viewing Deleted / Archived Orders' : `${pagination.total} active orders in system`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showDeleted ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setShowDeleted(prev => !prev); setPage(1); }}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {showDeleted ? 'Show Active Orders' : 'Trash / Recover'}
          </Button>

          <Link to="/admin/orders/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Order (Manual)
            </Button>
          </Link>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
          <input
            className="glass-input pl-9"
            placeholder="Search order code, project name, customer..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_review">In Review</option>
          <option value="revision">Revision</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      <Table columns={columns} data={orders} loading={loading} emptyTitle={showDeleted ? 'Trash is empty' : 'No orders found'} getRowClass={showDeleted ? undefined : getOrderRowClass} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="opacity-50 text-xs">{pagination.total} total orders</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm opacity-70">{page} / {pagination.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={chatModalOpen} onClose={() => setChatModalOpen(false)} title={`Live Chat — ${chatOrder?.order_code}: ${chatOrder?.project_name}`} maxWidth="max-w-3xl">
        {chatOrder && (
          <div className="p-1">
            <OrderChat orderId={chatOrder.id} isLocked={chatOrder.status === 'completed'} />
          </div>
        )}
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Admin Edit — ${selectedOrder?.order_code}`} maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} loading={editLoading}>Save Changes</Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Order Taker"
              value={editForm.order_taker_id}
              onChange={e => setEditForm(p => ({ ...p, order_taker_id: e.target.value }))}
            >
              <option value="">Admin / None</option>
              {orderTakers.map(ot => (
                <option key={ot.id} value={ot.id}>{ot.name} ({ot.employee_id})</option>
              ))}
            </Select>
            <Select
              label="Order Status"
              value={editForm.status}
              onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_review">In Review</option>
              <option value="revision">Revision</option>
              <option value="completed">Completed</option>
            </Select>
          </div>

          <Input label="Project Name" value={editForm.project_name} onChange={e => setEditForm(p => ({ ...p, project_name: e.target.value }))} required />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Customer Name" value={editForm.customer_name} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} />
            <Input label="Customer Phone" value={editForm.customer_phone} onChange={e => setEditForm(p => ({ ...p, customer_phone: e.target.value }))} />
            <Input label="Customer Email" type="email" value={editForm.customer_email} onChange={e => setEditForm(p => ({ ...p, customer_email: e.target.value }))} />
          </div>

          <Textarea label="Script" value={editForm.script} onChange={e => setEditForm(p => ({ ...p, script: e.target.value }))} rows={4} required />
          <Textarea label="Notes / Remarks" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Total Amount (Rs.)" type="number" value={editForm.total_amount} onChange={e => setEditForm(p => ({ ...p, total_amount: e.target.value }))} required />
            <Input label="Advance Paid (Rs.)" type="number" value={editForm.advance_amount} onChange={e => setEditForm(p => ({ ...p, advance_amount: e.target.value }))} required />
          </div>
        </form>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Manual Payment — ${selectedOrder?.order_code}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} loading={paymentLoading}>Apply Payment</Button>
          </>
        }
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 glass-panel rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="opacity-60">Order Total:</span>
              <strong className="font-heading">{formatCurrency(selectedOrder?.total_amount)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Current Received:</span>
              <strong className="text-green-500 font-heading">{formatCurrency(selectedOrder?.advance_amount)}</strong>
            </div>
            <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-1">
              <span className="opacity-60">Pending Balance:</span>
              <strong className="text-orange-500 font-heading">{formatCurrency(selectedOrder?.pending_amount)}</strong>
            </div>
          </div>

          <Select
            label="Payment Action"
            value={paymentAction}
            onChange={e => setPaymentAction(e.target.value)}
          >
            <option value="add">Add Payment Amount (e.g. customer paid more)</option>
            <option value="set">Set Exact Received Amount (overwrite)</option>
            <option value="reset">Reset Payment (set to 0)</option>
          </Select>

          {paymentAction !== 'reset' && (
            <Input
              label={paymentAction === 'add' ? 'Amount to Add (Rs.)' : 'New Exact Amount (Rs.)'}
              type="number"
              min="0"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder="0"
              required
            />
          )}
        </form>
      </Modal>

      <Modal
        open={adDaysModalOpen}
        onClose={() => setAdDaysModalOpen(false)}
        title={`Daily Attendance & Ads Management — ${selectedAdOrder?.order_code}`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdDaysModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdDays} loading={adDaysLoading}>Save Attendance Records</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl glass-panel space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="opacity-60 font-heading">Project:</span>
              <span className="font-heading font-bold text-sm text-orange-400">{selectedAdOrder?.project_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
              <div className="p-2 rounded-lg bg-black/20">
                <span className="opacity-50 block text-[10px] uppercase tracking-wider">Month Days</span>
                <span className="font-heading font-bold text-base">{adDaysForm.month_days} Days</span>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-green-400 block text-[10px] uppercase tracking-wider font-bold">Present (Active)</span>
                <span className="font-heading font-bold text-base text-green-400">{adDaysForm.active_days} Days</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-700/20 border border-zinc-600/20">
                <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-bold">Absent (Off)</span>
                <span className="font-heading font-bold text-base text-zinc-300">
                  {Math.max(0, Number(adDaysForm.month_days) - Number(adDaysForm.active_days))} Days
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Overall Ads Running Status"
              value={adDaysForm.ad_status}
              onChange={e => setAdDaysForm(prev => ({ ...prev, ad_status: e.target.value }))}
            >
              <option value="active">Active (Currently Running)</option>
              <option value="deactive">Deactive (Paused / Off)</option>
            </Select>

            <Input
              label="Total Billing Cycle Days"
              type="number"
              min="1"
              max="31"
              value={adDaysForm.month_days}
              onChange={e => setAdDaysForm(prev => ({ ...prev, month_days: e.target.value }))}
              placeholder="30"
              required
            />
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="section-label text-xs">Manual Daily Entry (Present / Absent)</span>
              <span className="text-[11px] opacity-50">Log individual active & off days</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end p-3 rounded-xl bg-black/20 border border-white/10">
              <Input
                label="Date"
                type="date"
                value={newEntryDate}
                onChange={e => setNewEntryDate(e.target.value)}
              />

              <Select
                label="Status"
                value={newEntryStatus}
                onChange={e => setNewEntryStatus(e.target.value)}
              >
                <option value="present">Present (Ad Run)</option>
                <option value="absent">Absent (Ad Off)</option>
              </Select>

              <Input
                label="Note / Remark"
                type="text"
                placeholder="e.g. Budget active"
                value={newEntryNote}
                onChange={e => setNewEntryNote(e.target.value)}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddDailyEntry}
                className="w-full"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
              </Button>
            </div>
          </div>

          <div>
            <div className="section-label mb-2 flex items-center justify-between">
              <span>Daily Attendance Log ({adDaysForm.daily_records?.length || 0} entries)</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {!adDaysForm.daily_records || adDaysForm.daily_records.length === 0 ? (
                <div className="text-center py-5 text-xs opacity-40">
                  No daily attendance entries logged yet. Add manual entries above or click the status toggle.
                </div>
              ) : (
                adDaysForm.daily_records.map((record, index) => {
                  const isPresent = record.status === 'present';
                  return (
                    <div
                      key={record.date || index}
                      className="flex items-center justify-between p-2.5 rounded-lg glass-panel text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">{formatDate(record.date)}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleDailyRecordStatus(index)}
                          className={`px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase transition-colors ${
                            isPresent
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                              : 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30'
                          }`}
                        >
                          {isPresent ? 'Present (Active)' : 'Absent (Off)'}
                        </button>
                        {record.note && (
                          <span className="opacity-50 text-[11px] truncate max-w-xs">{record.note}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDailyEntry(record.date)}
                        className="p-1 rounded opacity-60 hover:opacity-100 hover:text-red-400 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Editor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assignLoading} disabled={!selectedEditorId}>Assign & Send Email</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            Assigning order <span className="text-orange-500 font-mono font-bold">{selectedOrder?.order_code}</span> — {selectedOrder?.project_name}
          </p>
          <Select label="Select Editor" value={selectedEditorId} onChange={e => setSelectedEditorId(e.target.value)}>
            <option value="">Choose an editor...</option>
            {editors.map(ed => (
              <option key={ed.id} value={ed.id}>{ed.name} ({ed.employee_id})</option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Order — ${viewOrder?.order_code}`} maxWidth="max-w-2xl">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="opacity-50">Project</span><p className="font-heading font-bold mt-0.5">{viewOrder.project_name}</p></div>
              <div><span className="opacity-50">Status</span><p className="mt-0.5"><Badge variant={viewOrder.status}>{viewOrder.status}</Badge></p></div>
              <div><span className="opacity-50">Order Taker</span><p className="mt-0.5">{viewOrder.order_taker?.name || '-'}</p></div>
              <div><span className="opacity-50">Editor</span><p className="mt-0.5">{viewOrder.editor?.name || 'Not assigned'}</p></div>
              <div><span className="opacity-50">Total Amount</span><p className="text-orange-500 font-heading font-bold mt-0.5">{formatCurrency(viewOrder.total_amount)}</p></div>
              <div><span className="opacity-50">Advance Paid</span><p className="text-green-500 font-heading font-bold mt-0.5">{formatCurrency(viewOrder.advance_amount)}</p></div>
              <div><span className="opacity-50">Pending</span><p className="text-yellow-500 font-heading font-bold mt-0.5">{formatCurrency(viewOrder.pending_amount)}</p></div>
              <div><span className="opacity-50">Date</span><p className="mt-0.5">{formatDate(viewOrder.created_at)}</p></div>
            </div>
            {viewOrder.script && (
              <div>
                <span className="text-sm opacity-50">Script</span>
                <div className="mt-1 p-3 rounded-lg glass-panel text-sm whitespace-pre-wrap">{viewOrder.script}</div>
              </div>
            )}
            {viewOrder.notes && (
              <div>
                <span className="text-sm opacity-50">Notes</span>
                <div className="mt-1 p-3 rounded-lg glass-panel text-sm">{viewOrder.notes}</div>
              </div>
            )}
            {viewOrder.files?.length > 0 && (
              <div>
                <span className="text-sm opacity-50">Files</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewOrder.files.map((f, i) => (
                    <a key={i} href={f.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-orange-500 text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                      <ExternalLink className="w-3 h-3" /> {f.file_name || `File ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
