import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Clock, UserCheck, CheckCircle2,
  Users, AlertCircle, FileText, Banknote, TrendingUp, Calculator, BarChart3, ArrowUpRight
} from 'lucide-react';
import { getDashboardStatsApi } from '../../api/settings';
import { getUsersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatters';

const StatCard = ({ label, value, icon: Icon, accent = false, currency = false, subtext = null }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: accent ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.08)',
          border: `1.5px solid ${accent ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        <Icon className={`w-4.5 h-4.5 ${accent ? 'text-orange-400' : 'text-white/60'}`} style={{ width: 18, height: 18 }} />
      </div>
      {subtext && (
        <span className="text-[11px] font-heading font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
          {subtext}
        </span>
      )}
    </div>
    <div className={`font-heading font-black text-2xl ${accent ? 'text-orange-400' : 'text-white'}`}>
      {currency ? formatCurrency(value) : value}
    </div>
    <div className="text-white/45 text-xs font-heading font-semibold uppercase tracking-wide mt-1">{label}</div>
  </div>
);

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await getUsersApi({ limit: 100 });
      setEmployees(res.users || []);
    } catch {
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardStatsApi({
        employeeId: employeeId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setStats(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [employeeId, startDate, endDate]);

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totalOrders = stats?.orders?.total || 0;
  const overallAov = stats?.averages?.overall_average_value || stats?.orders?.average_order_value || 0;
  const personAverages = stats?.averages?.person_averages || [];

  const orderCards = [
    { label: 'Total Orders',      value: totalOrders,              icon: ShoppingCart },
    { label: 'Pending',           value: stats?.orders?.pending   || 0, icon: Clock },
    { label: 'Assigned',          value: stats?.orders?.assigned  || 0, icon: UserCheck, accent: true },
    { label: 'In Review',         value: stats?.orders?.in_review || 0, icon: AlertCircle, accent: true },
    { label: 'Under Revision',    value: stats?.orders?.revision  || 0, icon: AlertCircle },
    { label: 'Completed',         value: stats?.orders?.completed || 0, icon: CheckCircle2, accent: true },
  ];

  const payCards = [
    { label: 'Total Revenue',          value: stats?.payments?.total_amount   || 0, icon: Banknote, currency: true, accent: true },
    { label: 'Average Order Value (AOV)', value: overallAov,                  icon: Calculator, currency: true, accent: true, subtext: `${totalOrders} orders` },
    { label: 'Amount Received',        value: stats?.payments?.advance_amount || 0, icon: TrendingUp, currency: true, accent: true },
    { label: 'Pending Payment',        value: stats?.payments?.pending_amount || 0, icon: AlertCircle, currency: true },
  ];

  const empCards = [
    { label: 'Total Staff',    value: stats?.employees?.total       || 0, icon: Users },
    { label: 'Order Takers',   value: stats?.employees?.order_takers|| 0, icon: FileText },
    { label: 'Video Editors',  value: stats?.employees?.editors     || 0, icon: UserCheck },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Real-time operations, order volume, individual performance, and averages</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/admin/orders">
            <Button variant="secondary" size="sm">Manage Orders</Button>
          </Link>
          <Link to="/admin/employees">
            <Button size="sm">Manage Staff</Button>
          </Link>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="section-label mb-3">Performance Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Filter by Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_id} — {emp.role?.replace('_', ' ')})
              </option>
            ))}
          </Select>
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="section-label mb-3">Order Statistics</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {orderCards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>
          </div>

          <div>
            <div className="section-label mb-3">Financial Performance & Average Value</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {payCards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="section-label flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-400" />
                  <span>Person-by-Person Order Average & Performance</span>
                </div>
                <p className="text-white/50 text-xs mt-0.5">
                  Breakdown of incoming orders, total volume generated, and average order value per Order Taker
                </p>
              </div>
              <div className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg font-mono">
                System Average: <span className="text-orange-400 font-bold">{formatCurrency(overallAov)}</span> / order
              </div>
            </div>

            {personAverages.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                No individual order taker statistics recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-heading text-xs uppercase tracking-wider">
                      <th className="py-3 px-3">Order Taker</th>
                      <th className="py-3 px-3 text-center">Orders Count</th>
                      <th className="py-3 px-3 text-center">Share of Orders</th>
                      <th className="py-3 px-3 text-right">Total Revenue</th>
                      <th className="py-3 px-3 text-right">Advance Received</th>
                      <th className="py-3 px-3 text-right">Pending Balance</th>
                      <th className="py-3 px-3 text-right font-bold text-orange-400">Order Average (AOV)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {personAverages.map((p) => {
                      const isAboveAvg = p.average_order_value >= overallAov && p.average_order_value > 0;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="font-heading font-semibold text-white flex items-center gap-2">
                              <span>{p.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                                {p.employee_id}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-heading font-bold text-white">
                            {p.order_count}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs font-mono font-semibold text-white/70">{p.share_percentage}%</span>
                              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-orange-500 rounded-full"
                                  style={{ width: `${Math.min(p.share_percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-heading font-semibold text-white">
                            {formatCurrency(p.total_revenue)}
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-400 font-mono text-xs">
                            {formatCurrency(p.advance_received)}
                          </td>
                          <td className="py-3.5 px-3 text-right text-amber-400 font-mono text-xs">
                            {formatCurrency(p.pending_balance)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-heading font-black text-orange-400 text-base">
                            <div className="inline-flex items-center gap-1">
                              <span>{formatCurrency(p.average_order_value)}</span>
                              {p.order_count > 0 && isAboveAvg && (
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" title="Above system average" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="section-label mb-3">Team Overview</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {empCards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
