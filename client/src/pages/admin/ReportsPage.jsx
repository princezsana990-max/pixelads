import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { exportReportApi, bulkImportApi } from '../../api/reports';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export const ReportsPage = () => {
  const toast = useToast();
  const [reportType, setReportType] = useState('orders');
  const [reportFormat, setReportFormat] = useState('csv');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const [importType, setImportType] = useState('employees');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  const handleExport = async (e) => {
    e.preventDefault();
    setExporting(true);

    try {
      const blob = await exportReportApi({
        type: reportType,
        format: reportFormat,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        year,
        month
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${Date.now()}.${reportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('type', importType);
      formData.append('file', importFile);

      const result = await bulkImportApi(formData);
      setImportResult(result);
      setImportFile(null);
      toast.success(`Import complete: ${result.successCount} of ${result.totalRows} succeeded`);
    } catch (err) {
      setImportError(err.message || 'Import failed');
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">
          Reports & Bulk Data Administration
        </h1>
        <p className="page-subtitle">
          Generate filtered Excel / CSV spreadsheets and perform bulk batch imports for employees and orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Filtered Datasets</CardTitle>
          </CardHeader>
          <form onSubmit={handleExport} className="space-y-4">
            <Select
              label="Dataset to Export *"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              required
            >
              <option value="orders">Orders Master Register</option>
              <option value="payments">Payments & Balance Summary</option>
              <option value="attendance">Staff Ads Attendance</option>
            </Select>

            <Select
              label="Output Format *"
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value)}
              required
            >
              <option value="csv">CSV (Comma Separated)</option>
              <option value="xlsx">Microsoft Excel (.xlsx)</option>
            </Select>

            {reportType === 'orders' && (
              <Select
                label="Order Status (Optional)"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_review">In Review</option>
                <option value="revision">Revision</option>
                <option value="completed">Completed</option>
              </Select>
            )}

            {reportType === 'attendance' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </Select>
                <Input
                  label="Year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="From Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="To Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={exporting}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download Generated File
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Wizard (CSV / Excel)</CardTitle>
          </CardHeader>
          <form onSubmit={handleImport} className="space-y-4">
            <Select
              label="Import Target *"
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              required
            >
              <option value="employees">Employees (Name, Phone, Username, Password, Role)</option>
              <option value="orders">Orders (Project Name, Script, Total Amount, Advance, Notes)</option>
            </Select>

            <div>
              <label className="form-label">
                Upload File (.csv or .xlsx) *
              </label>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={importing}
                required
                className="glass-input text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-white/20 file:text-xs file:font-heading file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
              {importFile && (
                <p className="mt-1 text-xs text-white/60 font-mono">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {importError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {importError}
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              loading={importing}
              disabled={!importFile}
            >
              <Upload className="w-4 h-4 mr-1.5 text-orange-400" />
              Process Bulk Import
            </Button>
          </form>

          {importResult && (
            <div className="mt-5 p-4 glass-panel rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-heading font-bold uppercase">
                <span className="text-white">Import Summary</span>
                <span className="text-orange-400">
                  {importResult.successCount} of {importResult.totalRows} succeeded
                </span>
              </div>

              {importResult.failedCount > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2 border-t border-white/10">
                  <div className="text-xs font-bold text-red-400">Row Errors:</div>
                  {importResult.errors?.map((err, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-white/60">
                      Row {err.row} ({err.identifier}): {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
