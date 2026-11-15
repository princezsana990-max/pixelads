import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Edit2, Trash2, KeyRound, ShieldAlert, ShieldCheck,
  Search, Calendar, Radio, Download, Plus, CheckCircle, XCircle
} from 'lucide-react';
import {
  getUsersApi, createUserApi, updateUserApi,
  updateCredentialsApi, updateStatusApi, deleteUserApi
} from '../../api/users';
import { toggleAdsApi, getAdsAttendanceApi, markAttendanceApi, deleteAttendanceApi } from '../../api/ads';
import { useSettings } from '../../context/SettingsContext';
import { generateAttendancePdf } from '../../utils/attendancePdf';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

export const EmployeesPage = () => {
  const toast = useToast();
  const { settings } = useSettings();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [activeTab, setActiveTab] = useState('list');
  const [attendance, setAttendance] = useState([]);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', username: '', password: '', role: 'order_taker' });
  const [credData, setCredData] = useState({ username: '', password: '' });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Attendance detail & manual edit modal
  const [attModalOpen, setAttModalOpen] = useState(false);
  const [attUser, setAttUser] = useState(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualStatus, setManualStatus] = useState('present');
  const [manualLoading, setManualLoading] = useState(false);
  const [toggleAdsLoading, setToggleAdsLoading] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsersApi({ page, limit: 10, role: roleFilter || undefined, search: debouncedSearch || undefined });
      setEmployees(res.users || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, debouncedSearch]);

  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const res = await getAdsAttendanceApi({ month: attendanceMonth, year: attendanceYear });
      setAttendance(res || []);
    } catch {
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceMonth, attendanceYear]);

  useEffect(() => {
    if (activeTab === 'list') fetchEmployees();
    else fetchAttendance();
  }, [activeTab, fetchEmployees, fetchAttendance]);

  const handleToggleBlock = async (user) => {
    try {
      await updateStatusApi(user.id, !user.is_blocked);
      toast.success(`${user.name} ${user.is_blocked ? 'unblocked' : 'blocked'}`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete employee ${user.name}? This cannot be undone.`)) return;
    try {
      await deleteUserApi(user.id);
      toast.success('Employee deleted');
      fetchEmployees();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      await createUserApi(formData);
      setCreateModalOpen(false);
      setFormData({ name: '', phone: '', email: '', username: '', password: '', role: 'order_taker' });
      toast.success('Employee created successfully');
      fetchEmployees();
    } catch (err) {
      setModalError(err.message || 'Failed to create employee');
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalLoading(true);
    setModalError('');
    try {
      await updateUserApi(selectedUser.id, { name: formData.name, phone: formData.phone, email: formData.email, role: formData.role });
      setEditModalOpen(false);
      toast.success('Employee updated');
      fetchEmployees();
    } catch (err) {
      setModalError(err.message || 'Failed to update');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCredSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalLoading(true);
    setModalError('');
    try {
      const payload = {};
      if (credData.username) payload.username = credData.username;
      if (credData.password) payload.password = credData.password;
      await updateCredentialsApi(selectedUser.id, payload);
      setCredModalOpen(false);
      setCredData({ username: '', password: '' });
      toast.success('Credentials updated');
    } catch (err) {
      setModalError(err.message || 'Failed to update credentials');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleAds = async (emp) => {
    setToggleAdsLoading(emp.id);
    try {
      const res = await toggleAdsApi(emp.id);
      toast.success(`Ads for ${emp.name} turned ${res.isOnline ? 'ON (Active)' : 'OFF (Paused)'}`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle ads');
    } finally {
      setToggleAdsLoading(null);
    }
  };

  const handleOpenAttendanceModal = (emp) => {
    setAttUser(emp);
    setManualDate(new Date().toISOString().slice(0, 10));
    setManualStatus('present');
    setAttModalOpen(true);
  };

  const handleManualMark = async (e) => {
    e.preventDefault();
    if (!attUser || !manualDate) return;
    setManualLoading(true);
    try {
      await markAttendanceApi({
        userId: attUser.id,
        date: manualDate,
        status: manualStatus
      });
      toast.success(`Attendance for ${manualDate} marked ${manualStatus.toUpperCase()}`);
      await fetchAttendance();
      // Update attUser state with fresh data from attendance
      const freshRes = await getAdsAttendanceApi({ month: attendanceMonth, year: attendanceYear });
      setAttendance(freshRes || []);
      const updated = (freshRes || []).find(e => e.id === attUser.id);
      if (updated) setAttUser(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance');
    } finally {
      setManualLoading(false);
    }
  };

  const handleToggleDayBreakdown = async (day) => {
    if (!attUser) return;
    const targetStatus = day.status === 'present' ? 'absent' : 'present';
    try {
      await markAttendanceApi({
        userId: attUser.id,
        date: day.date,
        status: targetStatus
      });
      toast.success(`${day.date} toggled to ${targetStatus.toUpperCase()}`);
      const freshRes = await getAdsAttendanceApi({ month: attendanceMonth, year: attendanceYear });
      setAttendance(freshRes || []);
      const updated = (freshRes || []).find(e => e.id === attUser.id);
      if (updated) setAttUser(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to update day record');
    }
  };

  const handleDownloadAttendancePdf = () => {
    try {
      const doc = generateAttendancePdf({
        attendance,
        month: attendanceMonth,
        year: attendanceYear,
        settings
      });
      const monthName = new Date(attendanceYear, attendanceMonth - 1).toLocaleString('en', { month: 'long' });
      doc.save(`Ads_Attendance_${monthName}_${attendanceYear}.pdf`);
      toast.success('Attendance PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to generate attendance PDF');
    }
  };

  const columns = [
    { key: 'employee_id', label: 'ID', render: (v) => <span className="font-mono text-xs text-orange-400">{v}</span> },
    { key: 'name', label: 'Name', render: (v) => <span className="font-heading font-bold text-white">{v}</span> },
    { key: 'username', label: 'Username', render: (v) => <span className="font-mono text-white/60 text-xs">{v}</span> },
    { key: 'phone', label: 'Phone', render: (v) => <span className="text-white/70 text-sm">{v || '-'}</span> },
    { key: 'role', label: 'Role', render: (v) => <Badge variant={v}>{v?.replace('_', ' ')}</Badge> },
    { key: 'is_blocked', label: 'Status', render: (v) => <Badge variant={v ? 'blocked' : 'active'}>{v ? 'Blocked' : 'Active'}</Badge> },
    {
      key: 'id', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setSelectedUser(row); setFormData({ name: row.name, phone: row.phone || '', email: row.email || '', role: row.role }); setEditModalOpen(true); }}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setSelectedUser(row); setCredData({ username: row.username, password: '' }); setCredModalOpen(true); }}
            className="p-1.5 rounded-lg text-white/50 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
            title="Reset Credentials"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleBlock(row)}
            className="p-1.5 rounded-lg text-white/50 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            title={row.is_blocked ? 'Unblock' : 'Block'}
          >
            {row.is_blocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleDeleteUser(row)}
            className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const ErrorBox = ({ msg }) => msg ? (
    <div className="mb-4 p-3 rounded-lg bg-red-500/12 border border-red-500/30 text-red-300 text-sm">{msg}</div>
  ) : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{pagination.total} team members registered</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'attendance' && (
            <Button variant="secondary" onClick={handleDownloadAttendancePdf} disabled={attendance.length === 0} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-1.5" /> Download Attendance PDF
            </Button>
          )}
          <Button onClick={() => { setFormData({ name: '', phone: '', email: '', username: '', password: '', role: 'order_taker' }); setCreateModalOpen(true); }} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-0">
        {['list', 'attendance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-heading font-bold text-sm capitalize transition-all border-b-2 ${
              activeTab === tab
                ? 'text-orange-400 border-orange-400'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {tab === 'list' ? 'Employee List' : 'Ads Attendance'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className="glass-input pl-9"
                placeholder="Search by name, username, ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="sm:w-44">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="order_taker">Order Taker</option>
              <option value="editor">Editor</option>
            </Select>
          </div>

          <Table columns={columns} data={employees} loading={loading} emptyTitle="No employees found" />

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-white/40 text-xs">{pagination.total} total employees</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="px-3 py-1.5 text-sm text-white/60 font-heading">{page} / {pagination.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'attendance' && (
        <>
          <div className="glass-card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div className="flex items-end gap-3">
              <Select label="Month" value={attendanceMonth} onChange={e => setAttendanceMonth(Number(e.target.value))} className="w-40">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </Select>
              <Select label="Year" value={attendanceYear} onChange={e => setAttendanceYear(Number(e.target.value))} className="w-32">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={handleDownloadAttendancePdf} disabled={attendance.length === 0}>
              <Download className="w-4 h-4 mr-1.5 text-orange-400" /> Export PDF
            </Button>
          </div>

          <div className="glass-card p-0 overflow-x-auto">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Present Days</th>
                  <th>Absent Days</th>
                  <th>Ads Status (Active / Deactive)</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-white/40">Loading attendance...</td></tr>
                ) : attendance.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-white/40">No attendance data for this period</td></tr>
                ) : attendance.map(emp => {
                  const isOnline = emp.is_online_now;
                  const isToggling = toggleAdsLoading === emp.id;

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className="font-heading font-bold text-white">{emp.name}</div>
                        <div className="text-xs font-mono text-white/40">{emp.employee_id}</div>
                      </td>
                      <td><Badge variant={emp.role}>{emp.role?.replace('_', ' ')}</Badge></td>
                      <td>
                        <span className="text-green-400 font-bold font-heading text-base">{emp.present_days || 0}</span>
                        <span className="text-xs text-white/40 ml-1">Days</span>
                      </td>
                      <td>
                        <span className="text-red-400 font-bold font-heading text-base">{emp.absent_days || 0}</span>
                        <span className="text-xs text-white/40 ml-1">Days</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleAds(emp)}
                          disabled={isToggling}
                          className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold transition-all flex items-center gap-2 ${
                            isOnline
                              ? 'bg-green-500/15 text-green-400 border border-green-500/40 hover:bg-green-500/25 shadow-sm'
                              : 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30 hover:bg-zinc-700/50'
                          }`}
                          title="Click to Toggle Ad Active / Deactive"
                        >
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
                          <span>{isToggling ? 'Updating...' : isOnline ? 'Active (Running)' : 'Deactive (Off)'}</span>
                        </button>
                      </td>
                      <td className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenAttendanceModal(emp)}
                          className="text-xs py-1 px-2.5"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1 text-orange-400" />
                          Manage Daily Attendance
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Manual Daily Attendance Management Modal */}
      <Modal
        open={attModalOpen}
        onClose={() => setAttModalOpen(false)}
        title={`Ads Attendance & Daily Records — ${attUser?.name} (${attUser?.employee_id})`}
        maxWidth="max-w-2xl"
        footer={<Button variant="secondary" onClick={() => setAttModalOpen(false)}>Close</Button>}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl glass-panel text-center">
            <div className="p-2 rounded-lg bg-black/20">
              <span className="text-[10px] text-white/40 uppercase block font-bold">Month Days</span>
              <span className="font-heading font-black text-lg text-white">{attUser?.total_days || 0} Days</span>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-[10px] text-green-400 uppercase block font-bold">Present (Active)</span>
              <span className="font-heading font-black text-lg text-green-400">{attUser?.present_days || 0} Days</span>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-[10px] text-red-400 uppercase block font-bold">Absent (Off)</span>
              <span className="font-heading font-black text-lg text-red-400">{attUser?.absent_days || 0} Days</span>
            </div>
          </div>

          <form onSubmit={handleManualMark} className="p-3.5 rounded-xl bg-black/20 border border-white/10 space-y-3">
            <span className="section-label text-xs block">Manual Date Entry</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Input
                label="Date"
                type="date"
                required
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
              />
              <Select
                label="Attendance Status"
                value={manualStatus}
                onChange={e => setManualStatus(e.target.value)}
              >
                <option value="present">Present (Ad Active)</option>
                <option value="absent">Absent (Ad Off)</option>
              </Select>
              <Button type="submit" loading={manualLoading} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Mark Date
              </Button>
            </div>
          </form>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="section-label text-xs">
                Daily Breakdown ({new Date(attendanceYear, attendanceMonth - 1).toLocaleString('en', { month: 'long' })} {attendanceYear})
              </span>
              <span className="text-[11px] opacity-40">Click status badge to toggle Present / Absent</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {(!attUser?.daily_breakdown || attUser.daily_breakdown.length === 0) ? (
                <div className="text-center py-6 text-xs text-white/40">No records found for this period.</div>
              ) : (
                attUser.daily_breakdown.map((day) => {
                  const isPresent = day.status === 'present';
                  return (
                    <div
                      key={day.date}
                      className="flex items-center justify-between p-2.5 rounded-lg glass-panel text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white/90">{formatDate(day.date)}</span>
                        <span className="text-white/40 text-[11px]">Day {day.day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDayBreakdown(day)}
                          className={`px-3 py-1 rounded-md text-[11px] font-heading font-bold uppercase transition-all flex items-center gap-1.5 ${
                            isPresent
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                          }`}
                          title="Click to toggle Present / Absent"
                        >
                          {isPresent ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                          {isPresent ? 'Present (Active)' : 'Absent (Off)'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add New Employee"
        footer={<><Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button><Button type="submit" form="create-form" loading={modalLoading}>Create Employee</Button></>}
      >
        <form id="create-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <ErrorBox msg={modalError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Employee name" />
            <Input label="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+92..." />
          </div>
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
          <Input label="Username" required value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} placeholder="login username" />
          <Input label="Password" type="password" required value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="secure password" />
          <Select label="Role" required value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
            <option value="order_taker">Order Taker</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </Select>
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Employee Profile"
        footer={<><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button type="submit" form="edit-form" loading={modalLoading}>Save Changes</Button></>}
      >
        <form id="edit-form" onSubmit={handleEditSubmit} className="space-y-4">
          <ErrorBox msg={modalError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            <Input label="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
          <Select label="Role" required value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
            <option value="order_taker">Order Taker</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </Select>
        </form>
      </Modal>

      <Modal open={credModalOpen} onClose={() => setCredModalOpen(false)} title={`Reset Credentials — ${selectedUser?.name}`}
        footer={<><Button variant="secondary" onClick={() => setCredModalOpen(false)}>Cancel</Button><Button type="submit" form="cred-form" loading={modalLoading}>Update Credentials</Button></>}
      >
        <form id="cred-form" onSubmit={handleCredSubmit} className="space-y-4">
          <ErrorBox msg={modalError} />
          <p className="text-white/50 text-sm">Leave fields empty to keep existing values.</p>
          <Input label="New Username" value={credData.username} onChange={e => setCredData(p => ({ ...p, username: e.target.value }))} />
          <Input label="New Password" type="password" value={credData.password} onChange={e => setCredData(p => ({ ...p, password: e.target.value }))} placeholder="Enter new password" />
        </form>
      </Modal>
    </div>
  );
};
