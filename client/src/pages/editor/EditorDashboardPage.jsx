import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { getOrdersApi } from '../../api/orders';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { formatDate, formatTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const EditorDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
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

  const columns = [
    { key: 'order_code', label: 'Order', render: (v) => <span className="font-mono font-bold text-orange-400">{v}</span> },
    { key: 'created_at', label: 'Assigned Date', render: (v) => (
      <div>
        <div className="text-white/80 text-xs">{formatDate(v)}</div>
        <div className="text-white/40 text-xs">{formatTime(v)}</div>
      </div>
    )},
    { key: 'project_name', label: 'Project', render: (v) => <span className="text-white font-heading font-semibold">{v}</span> },
    { key: 'order_taker', label: 'Order Taker', render: (_, row) => <span className="text-white/70 text-sm">{row.order_taker?.name || '-'}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={v}>{v}</Badge> },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <Link to={`/editor/orders/${row.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-xs font-heading font-bold" style={{ width: 'fit-content' }}>
          <Eye className="w-3.5 h-3.5" /> Open Project
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Assigned Projects</h1>
        <p className="page-subtitle">{pagination.total} orders assigned to you</p>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="glass-input pl-9" placeholder="Search assigned projects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_review">In Review</option>
          <option value="revision">Revision</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      <Table columns={columns} data={orders} loading={loading} emptyTitle="No assignments" emptyDescription="New orders will appear here once an admin assigns them to you" />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-white/40 text-xs">{pagination.total} total</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-white/60">{page} / {pagination.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};
