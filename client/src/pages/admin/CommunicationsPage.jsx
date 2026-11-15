import React, { useState, useEffect, useCallback } from 'react';
import { Phone, MessageSquare, Search, User } from 'lucide-react';
import { getCommunicationsApi, lookupCustomerApi, logCommunicationApi } from '../../api/communications';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const CommunicationsPage = () => {
  const toast = useToast();
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [form, setForm] = useState({ phone: '', type: 'call', direction: 'inbound', duration_seconds: '', notes: '', order_id: '' });

  const debouncedSearch = useDebounce(search, 350);

  const fetchComms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommunicationsApi({ page, limit: 15, type: typeFilter || undefined, search: debouncedSearch || undefined });
      setComms(res.data || res.communications || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch {
      setComms([]);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, debouncedSearch]);

  useEffect(() => { fetchComms(); }, [fetchComms]);

  const handleLookup = async () => {
    if (!lookupPhone.trim()) return;
    setLookupLoading(true);
    try {
      const res = await lookupCustomerApi(lookupPhone.trim());
      setLookupResult(res);
    } catch (err) {
      toast.error(err.message || 'No customer found');
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLog = async (e) => {
    e.preventDefault();
    setLogLoading(true);
    try {
      await logCommunicationApi({ ...form, duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : undefined });
      toast.success('Communication logged');
      setLogModalOpen(false);
      setForm({ phone: '', type: 'call', direction: 'inbound', duration_seconds: '', notes: '', order_id: '' });
      fetchComms();
    } catch (err) {
      toast.error(err.message || 'Failed to log');
    } finally {
      setLogLoading(false);
    }
  };

  const dirVariant = { inbound: 'completed', outbound: 'assigned' };

  const columns = [
    { key: 'type', label: 'Type', render: (v) => (
      <span className="flex items-center gap-1.5">
        {v === 'call' ? <Phone className="w-3.5 h-3.5 text-orange-400" /> : <MessageSquare className="w-3.5 h-3.5 text-blue-400" />}
        <span className="text-white/70 text-sm capitalize">{v}</span>
      </span>
    )},
    { key: 'direction', label: 'Direction', render: (v) => <Badge variant={dirVariant[v] || 'default'}>{v}</Badge> },
    { key: 'phone', label: 'Phone', render: (v) => <span className="font-mono text-white/80">{v}</span> },
    { key: 'customer_name', label: 'Customer', render: (v, row) => <span className="text-white font-heading font-semibold">{v || row.identified_customer?.name || 'Unknown'}</span> },
    { key: 'order_code', label: 'Order', render: (_, row) => row.order?.order_code ? <span className="font-mono text-orange-400">{row.order.order_code}</span> : <span className="text-white/30">-</span> },
    { key: 'created_at', label: 'Date / Time', render: (v) => <span className="text-white/60 text-xs">{formatDateTime(v)}</span> },
    { key: 'notes', label: 'Notes', render: (v) => <span className="text-white/50 text-sm truncate max-w-xs block">{v || '-'}</span> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Communications</h1>
          <p className="page-subtitle">Call and SMS history with customer identification</p>
        </div>
        <Button onClick={() => setLogModalOpen(true)}>
          <Phone className="w-4 h-4" /> Log Communication
        </Button>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="section-label">Customer Lookup by Phone</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="glass-input flex-1"
            placeholder="Enter phone number to identify customer..."
            value={lookupPhone}
            onChange={e => setLookupPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <Button variant="secondary" onClick={handleLookup} loading={lookupLoading}>
            <Search className="w-4 h-4" /> Lookup
          </Button>
        </div>
        {lookupResult && (
          <div className="p-4 rounded-xl glass-panel animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(249,115,22,0.2)', border: '1.5px solid rgba(249,115,22,0.4)' }}>
                <User className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="font-heading font-bold text-white">{lookupResult.name || 'Unknown Customer'}</div>
                <div className="text-white/50 text-xs mt-0.5">{lookupResult.phone}</div>
                {lookupResult.orders?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lookupResult.orders.slice(0, 5).map(o => (
                      <span key={o.id} className="font-mono text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">{o.order_code}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="glass-input pl-9" placeholder="Search by phone, name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="sm:w-36">
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="sms">SMS</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table columns={columns} data={comms} loading={loading} emptyTitle="No communications logged" emptyDescription="Use the log button to record calls and SMS" />
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/40 text-xs">{pagination.total} records</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-white/60">{page} / {pagination.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={logModalOpen} onClose={() => setLogModalOpen(false)} title="Log Communication"
        footer={<><Button variant="secondary" onClick={() => setLogModalOpen(false)}>Cancel</Button><Button type="submit" form="log-form" loading={logLoading}>Log</Button></>}
      >
        <form id="log-form" onSubmit={handleLog} className="space-y-4">
          <Input label="Phone Number" required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+92..." />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="call">Call</option>
              <option value="sms">SMS</option>
            </Select>
            <Select label="Direction" value={form.direction} onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </Select>
          </div>
          {form.type === 'call' && (
            <Input label="Duration (seconds)" type="number" value={form.duration_seconds} onChange={e => setForm(p => ({ ...p, duration_seconds: e.target.value }))} placeholder="e.g. 120" min="0" />
          )}
          <Input label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Conversation summary..." />
        </form>
      </Modal>
    </div>
  );
};
