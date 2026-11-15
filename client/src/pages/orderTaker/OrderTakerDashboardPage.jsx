import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, FileText, Eye, Edit2, Trash2, Download } from 'lucide-react';
import { getOrdersApi, updateOrderApi, deleteOrderApi, getOrderByIdApi } from '../../api/orders';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import { generateInvoicePdf } from '../../utils/invoicePdf';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const OrderTakerDashboardPage = () => {
  const toast = useToast();
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editForm, setEditForm] = useState({ project_name: '', script: '', notes: '', customer_name: '', customer_phone: '', total_amount: '', advance_amount: '' });
  const [editLoading, setEditLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrdersApi({ page, limit: 31, status: status || undefined, search: debouncedSearch || undefined });
      setOrders(result.orders || []);
      setPagination(result.pagination || { total: 0, totalPages: 1 });
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleOpenEdit = (order) => {
    setSelectedOrder(order);
    setEditForm({
      project_name: order.project_name || '',
      script: order.script || '',
      notes: order.notes || '',
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      total_amount: order.total_amount || '',
      advance_amount: order.advance_amount || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setEditLoading(true);
    try {
      await updateOrderApi(selectedOrder.id, {
        project_name: editForm.project_name,
        script: editForm.script,
        notes: editForm.notes,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        total_amount: Number(editForm.total_amount),
        advance_amount: Number(editForm.advance_amount)
      });
      toast.success('Order details updated');
      setEditModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order ${order.order_code}? (Admin can recover it if needed)`)) return;
    try {
      await deleteOrderApi(order.id);
      toast.success(`Order ${order.order_code} deleted`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to delete order');
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

  const columns = [
    { key: 'order_code', label: 'Order', render: (v) => <span className="font-mono font-bold text-orange-500">{v}</span> },
    { key: 'created_at', label: 'Date / Time', render: (v) => (
      <div>
        <div className="text-xs opacity-80">{formatDate(v)}</div>
        <div className="text-xs opacity-50">{formatTime(v)}</div>
      </div>
    )},
    { key: 'project_name', label: 'Project', render: (v) => <span className="font-heading font-semibold">{v}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={v}>{v}</Badge> },
    { key: 'total_amount', label: 'Total', render: (v) => <span className="font-heading font-bold">{formatCurrency(v)}</span> },
    { key: 'pending_amount', label: 'Pending', render: (v) => <span className={`font-heading font-bold ${Number(v) > 0 ? 'text-yellow-500' : 'opacity-40'}`}>{formatCurrency(v)}</span> },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleDownloadInvoice(row)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-500 transition-colors"
            title="Download PDF Invoice"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <Link to={`/order-taker/orders/${row.id}/invoice`}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-500 transition-colors" title="View Invoice Page">
            <FileText className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => handleOpenEdit(row)}
            disabled={row.status === 'completed'}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-blue-500 transition-colors disabled:opacity-20"
            title="Edit Order"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-red-500 transition-colors"
            title="Delete Order"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {['in_review', 'revision'].includes(row.status) && (
            <Link to={`/order-taker/orders/${row.id}/review`}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-orange-500 transition-colors" title="Review">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">{pagination.total} orders submitted</p>
        </div>
        <Link to="/order-taker/orders/new">
          <Button>
            <PlusCircle className="w-4 h-4" /> New Order
          </Button>
        </Link>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
          <input
            className="glass-input pl-9"
            placeholder="Search orders..."
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

      <Table columns={columns} data={orders} loading={loading} emptyTitle="No orders found" emptyDescription="Submit your first order using the New Order button above" />

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

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Order ${selectedOrder?.order_code}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} loading={editLoading}>Save Changes</Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input label="Project Name" value={editForm.project_name} onChange={e => setEditForm(p => ({ ...p, project_name: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Customer Name" value={editForm.customer_name} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} />
            <Input label="Customer Phone" value={editForm.customer_phone} onChange={e => setEditForm(p => ({ ...p, customer_phone: e.target.value }))} />
          </div>
          <Textarea label="Script" value={editForm.script} onChange={e => setEditForm(p => ({ ...p, script: e.target.value }))} rows={4} required />
          <Textarea label="Notes / Remarks" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Total Amount (Rs.)" type="number" value={editForm.total_amount} onChange={e => setEditForm(p => ({ ...p, total_amount: e.target.value }))} required />
            <Input label="Advance Paid (Rs.)" type="number" value={editForm.advance_amount} onChange={e => setEditForm(p => ({ ...p, advance_amount: e.target.value }))} required />
          </div>
        </form>
      </Modal>
    </div>
  );
};
