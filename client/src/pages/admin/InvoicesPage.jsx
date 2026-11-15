import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Download, CreditCard, Search } from 'lucide-react';
import { getInvoicesApi, createInvoiceApi, recordInvoicePaymentApi } from '../../api/invoices';
import { getOrdersApi } from '../../api/orders';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const InvoicesPage = () => {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [orders, setOrders] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    order_id: '', customer_name: '', description: '', amount: '',
    discount: '0', paid_amount: '0', payment_method: 'cash', notes: ''
  });

  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', notes: '' });

  const debouncedSearch = useDebounce(search, 350);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoicesApi({ page, limit: 10, status: statusFilter || undefined, search: debouncedSearch || undefined });
      setInvoices(res.invoices || res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  const fetchOrders = async () => {
    try {
      const res = await getOrdersApi({ limit: 100 });
      setOrders(res.orders || []);
    } catch {
    }
  };

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchOrders(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await createInvoiceApi({
        order_id: form.order_id,
        customer_name: form.customer_name,
        description: form.description,
        amount: Number(form.amount),
        discount: Number(form.discount || 0),
        paid_amount: Number(form.paid_amount || 0),
        payment_method: form.payment_method,
        notes: form.notes,
      });
      toast.success('Invoice created successfully');
      setCreateModalOpen(false);
      setForm({ order_id: '', customer_name: '', description: '', amount: '', discount: '0', paid_amount: '0', payment_method: 'cash', notes: '' });
      fetchInvoices();
    } catch (err) {
      setCreateError(err.message || 'Failed to create invoice');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPayLoading(true);
    try {
      await recordInvoicePaymentApi(selectedInvoice.id, {
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
        notes: payForm.notes,
      });
      toast.success('Payment recorded');
      setPayModalOpen(false);
      setPayForm({ amount: '', payment_method: 'cash', notes: '' });
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const statusVariant = { paid: 'completed', partial: 'pending', unpaid: 'revision', draft: 'default' };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (v) => <span className="font-mono text-orange-400 font-bold">{v}</span> },
    { key: 'order_code', label: 'Order', render: (_, row) => <span className="font-mono text-white/60">{row.order?.order_code || '-'}</span> },
    { key: 'customer_name', label: 'Customer', render: (v) => <span className="text-white font-heading font-semibold">{v || '-'}</span> },
    { key: 'created_at', label: 'Date', render: (v) => <span className="text-white/60 text-sm">{formatDate(v)}</span> },
    { key: 'total_amount', label: 'Total', render: (v) => <span className="font-heading font-bold text-white">{formatCurrency(v)}</span> },
    { key: 'paid_amount', label: 'Paid', render: (v) => <span className="text-green-400 font-heading font-bold">{formatCurrency(v)}</span> },
    { key: 'remaining_amount', label: 'Remaining', render: (v) => <span className={`font-heading font-bold ${Number(v) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={statusVariant[v] || 'default'}>{v}</Badge> },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setSelectedInvoice(row); setDetailModalOpen(true); }}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="View">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'paid' && (
            <button onClick={() => { setSelectedInvoice(row); setPayForm({ amount: String(row.remaining_amount || ''), payment_method: 'cash', notes: '' }); setPayModalOpen(true); }}
              className="p-1.5 rounded-lg text-white/50 hover:text-green-400 hover:bg-green-400/10 transition-colors" title="Record Payment">
              <CreditCard className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{pagination.total} total invoices</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4" /> Create Invoice
        </Button>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="glass-input pl-9" placeholder="Search invoices..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-40">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table columns={columns} data={invoices} loading={loading} emptyTitle="No invoices found" />
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/40 text-xs">{pagination.total} invoices</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-white/60">{page} / {pagination.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Invoice"
        footer={<><Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button><Button type="submit" form="create-invoice-form" loading={createLoading}>Create Invoice</Button></>}
      >
        <form id="create-invoice-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <div className="p-3 rounded-lg bg-red-500/12 border border-red-500/30 text-red-300 text-sm">{createError}</div>}
          <Select label="Link to Order" required value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))}>
            <option value="">Select an order...</option>
            {orders.map(o => <option key={o.id} value={o.id}>{o.order_code} — {o.project_name}</option>)}
          </Select>
          <Input label="Customer Name" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer or company name" />
          <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Invoice description / services rendered" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (Rs.)" type="number" required value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" min="0" />
            <Input label="Discount (Rs.)" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} placeholder="0" min="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Paid Amount (Rs.)" type="number" value={form.paid_amount} onChange={e => setForm(p => ({ ...p, paid_amount: e.target.value }))} placeholder="0" min="0" />
            <Select label="Payment Method" value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
        </form>
      </Modal>

      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} title={`Record Payment — ${selectedInvoice?.invoice_number}`}
        footer={<><Button variant="secondary" onClick={() => setPayModalOpen(false)}>Cancel</Button><Button type="submit" form="pay-form" loading={payLoading}>Record Payment</Button></>}
      >
        <form id="pay-form" onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-white/50 text-sm">Remaining balance: <span className="text-yellow-400 font-heading font-bold">{formatCurrency(selectedInvoice?.remaining_amount)}</span></p>
          <Input label="Payment Amount (Rs.)" type="number" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" min="1" />
          <Select label="Payment Method" value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Notes" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reference number, remarks..." />
        </form>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Invoice — ${selectedInvoice?.invoice_number}`} maxWidth="max-w-lg">
        {selectedInvoice && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-white/40">Customer</span><p className="text-white font-heading font-bold mt-0.5">{selectedInvoice.customer_name || '-'}</p></div>
              <div><span className="text-white/40">Status</span><p className="mt-0.5"><Badge variant={statusVariant[selectedInvoice.status] || 'default'}>{selectedInvoice.status}</Badge></p></div>
              <div><span className="text-white/40">Invoice Total</span><p className="text-orange-400 font-heading font-black mt-0.5">{formatCurrency(selectedInvoice.total_amount)}</p></div>
              <div><span className="text-white/40">Amount Paid</span><p className="text-green-400 font-heading font-black mt-0.5">{formatCurrency(selectedInvoice.paid_amount)}</p></div>
              <div><span className="text-white/40">Remaining</span><p className="text-yellow-400 font-heading font-black mt-0.5">{formatCurrency(selectedInvoice.remaining_amount)}</p></div>
              <div><span className="text-white/40">Date</span><p className="text-white mt-0.5">{formatDate(selectedInvoice.created_at)}</p></div>
            </div>
            {selectedInvoice.description && (
              <div>
                <span className="text-white/40">Description</span>
                <div className="mt-1 p-3 rounded-lg glass-panel text-white/80">{selectedInvoice.description}</div>
              </div>
            )}
            {selectedInvoice.notes && (
              <div>
                <span className="text-white/40">Notes</span>
                <div className="mt-1 p-3 rounded-lg glass-panel text-white/70">{selectedInvoice.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
