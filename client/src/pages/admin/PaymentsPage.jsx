import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, TrendingUp, AlertCircle, Edit2, MessageSquare, Download, CheckCircle, RefreshCw, Calendar, Plus, Trash2 } from 'lucide-react';
import { getPaymentsSummaryApi, recordManualPaymentApi, updateOrderPaymentApi } from '../../api/payments';
import { getOrderByIdApi, updateAdStatusApi } from '../../api/orders';
import { getUsersApi } from '../../api/users';
import { useSettings } from '../../context/SettingsContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { OrderChat } from '../../components/chat/OrderChat';
import { generateInvoicePdf } from '../../utils/invoicePdf';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';

export const PaymentsPage = () => {
  const toast = useToast();
  const { settings } = useSettings();
  const [data, setData] = useState({ totals: {}, orders: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAction, setPaymentAction] = useState('add');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);

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
  const [adStatusLoading, setAdStatusLoading] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await getUsersApi({ role: 'order_taker', limit: 100 });
      setEmployees(res.users || []);
    } catch {
    }
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPaymentsSummaryApi({ page, limit: 10, employeeId: employeeId || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
      setData(res || { totals: {}, orders: [], pagination: {} });
    } catch {
      setData({ totals: {}, orders: [], pagination: {} });
    } finally {
      setLoading(false);
    }
  }, [page, employeeId, startDate, endDate]);

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleOpenPaymentModal = (order) => {
    setPaymentOrder(order);
    setPaymentAction('add');
    setPaymentAmount('');
    setTotalAmountInput(order.total_amount || 0);
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentOrder) return;
    setPaymentLoading(true);
    try {
      if (paymentAction === 'edit_totals') {
        await updateOrderPaymentApi(paymentOrder.id, {
          total_amount: Number(totalAmountInput),
          advance_amount: Number(paymentAmount)
        });
        toast.success(`Payment updated for order #${paymentOrder.order_code}`);
      } else {
        await recordManualPaymentApi(paymentOrder.id, {
          action: paymentAction,
          amount: Number(paymentAmount)
        });
        toast.success(`Payment recorded for order #${paymentOrder.order_code}`);
      }
      setPaymentModalOpen(false);
      fetchPayments();
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
      toast.success(`Invoice for #${order.order_code} downloaded`);
    } catch {
      toast.error('Failed to download invoice PDF');
    }
  };

  const handleToggleAdStatus = async (order) => {
    const currentStatus = order.ad_status || 'deactive';
    const newStatus = currentStatus === 'active' ? 'deactive' : 'active';
    setAdStatusLoading(order.id);
    try {
      await updateAdStatusApi(order.id, { ad_status: newStatus });
      toast.success(`Ad status for ${order.order_code}: ${newStatus.toUpperCase()}`);
      fetchPayments();
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
      fetchPayments();
    } catch (err) {
      toast.error(err.message || 'Failed to update ads schedule');
    } finally {
      setAdDaysLoading(false);
    }
  };

  const summaryCards = [
    { label: 'Total Order Value', value: data.totals?.total_amount || 0, icon: Banknote, accent: true },
    { label: 'Amount Received', value: data.totals?.advance_amount || 0, icon: TrendingUp, accent: true },
    { label: 'Pending Collection', value: data.totals?.pending_amount || 0, icon: AlertCircle },
  ];

  const columns = [
    { key: 'order_code', label: 'Order', render: (v) => <span className="font-mono text-orange-400 font-bold">{v}</span> },
    { key: 'created_at', label: 'Date', render: (v) => <span className="text-white/70 text-sm">{formatDate(v)}</span> },
    { key: 'order_taker', label: 'Order Taker', render: (_, row) => <span className="text-white/70 text-sm">{row.order_taker?.name || '-'}</span> },
    { key: 'project_name', label: 'Project', render: (v) => <span className="text-white font-heading font-semibold">{v}</span> },
    { key: 'total_amount', label: 'Total', render: (v) => <span className="font-heading font-bold text-white">{formatCurrency(v)}</span> },
    { key: 'advance_amount', label: 'Received', render: (v) => <span className="font-heading font-bold text-green-400">{formatCurrency(v)}</span> },
    { key: 'pending_amount', label: 'Pending', render: (v) => <span className={`font-heading font-bold ${Number(v) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={v}>{v}</Badge> },
    {
      key: 'ad_status',
      label: 'Ads & Attendance',
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
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
            onClick={() => handleOpenPaymentModal(row)}
            title="Manual Payment / Edit Amounts"
          >
            <Edit2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
            onClick={() => { setChatOrder(row); setChatModalOpen(true); }}
            title="Open Live Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10"
            onClick={() => handleDownloadInvoice(row)}
            title="Download PDF Invoice"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Financial summary, manual payment entries, and customer invoices</p>
      </div>

      <div className="glass-card p-5">
        <div className="section-label mb-3">Filter Payments</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="Order Taker" value={employeeId} onChange={e => { setEmployeeId(e.target.value); setPage(1); }}>
            <option value="">All Order Takers</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </Select>
          <Input label="From Date" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          <Input label="To Date" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-8 w-24" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/40 text-xs font-heading font-bold uppercase tracking-wide">{c.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: c.accent ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.08)', border: `1.5px solid ${c.accent ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.12)'}` }}>
                    <Icon className={`w-4 h-4 ${c.accent ? 'text-orange-400' : 'text-white/60'}`} />
                  </div>
                </div>
                <div className={`font-heading font-black text-2xl ${c.accent ? 'text-orange-400' : 'text-yellow-400'}`}>
                  {formatCurrency(c.value)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Table columns={columns} data={data.orders || []} loading={loading} emptyTitle="No payment records found" />

      {data.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/40 text-xs">{data.pagination?.total} total records</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-white/60">{page} / {data.pagination?.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pagination?.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Payment Management — ${paymentOrder?.order_code}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} loading={paymentLoading}>Save Payment</Button>
          </>
        }
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div className="p-3 rounded-lg glass-panel space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">Project:</span>
              <span className="font-heading font-bold">{paymentOrder?.project_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Total Value:</span>
              <span className="font-bold text-orange-400">{formatCurrency(paymentOrder?.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Currently Received:</span>
              <span className="font-bold text-green-400">{formatCurrency(paymentOrder?.advance_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Pending Outstanding:</span>
              <span className="font-bold text-yellow-400">{formatCurrency(paymentOrder?.pending_amount)}</span>
            </div>
          </div>

          <Select
            label="Payment Action"
            value={paymentAction}
            onChange={e => {
              setPaymentAction(e.target.value);
              if (e.target.value === 'edit_totals') {
                setPaymentAmount(paymentOrder?.advance_amount || 0);
              } else if (e.target.value === 'reset') {
                setPaymentAmount(0);
              } else {
                setPaymentAmount('');
              }
            }}
          >
            <option value="add">Add Additional Payment (e.g. Received more cash)</option>
            <option value="set">Set Exact Received Amount (Overwrite paid)</option>
            <option value="edit_totals">Edit Total Order Price & Received Amount</option>
            <option value="reset">Reset Payment (Set received to 0)</option>
          </Select>

          {paymentAction === 'edit_totals' && (
            <Input
              label="Total Order Amount (Rs.)"
              type="number"
              min="0"
              value={totalAmountInput}
              onChange={e => setTotalAmountInput(e.target.value)}
              required
            />
          )}

          {paymentAction !== 'reset' && (
            <Input
              label={
                paymentAction === 'add'
                  ? 'Amount to Add (Rs.)'
                  : paymentAction === 'edit_totals'
                  ? 'Received / Advance Amount (Rs.)'
                  : 'New Exact Received Amount (Rs.)'
              }
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
        open={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        title={`Live Chat — ${chatOrder?.order_code}: ${chatOrder?.project_name}`}
        maxWidth="max-w-3xl"
      >
        {chatOrder && (
          <div className="h-[550px] flex flex-col">
            <OrderChat orderId={chatOrder.id} isLocked={chatOrder.status === 'completed'} />
          </div>
        )}
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
    </div>
  );
};
