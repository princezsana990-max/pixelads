import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, Download, ArrowLeft, Receipt } from 'lucide-react';
import { getOrderByIdApi } from '../../api/orders';
import { useSettings } from '../../context/SettingsContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate, formatTime, formatCleanNotes, formatOrderType } from '../../utils/formatters';
import { generateInvoicePdf } from '../../utils/invoicePdf';

export const OrderInvoicePage = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderByIdApi(id);
        setOrder(data);
      } catch (err) {
        setError(err.message || 'Failed to load order invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleDownloadPdf = () => {
    if (!order) return;
    const doc = generateInvoicePdf(order, settings);
    doc.save(`Invoice_${order.order_code}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto p-6 glass-card border-red-500/30 text-center">
        <p className="text-red-400 text-sm font-semibold">{error || 'Order not found'}</p>
        <Link to="/order-taker/dashboard" className="inline-block mt-4">
          <Button variant="secondary" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/order-taker/dashboard" className="text-white/60 hover:text-white p-2 glass-panel rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="page-title">
              Invoice #{order.order_code}
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              Generated on {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="glass-card p-8 space-y-8 bg-zinc-900/90 text-white print:bg-white print:text-black print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-white/10 pb-6 print:border-black">
          <div>
            <div className="font-heading font-black text-2xl text-orange-400 print:text-black">
              {settings?.company_name || 'PIXEL ADS'}
            </div>
            <p className="text-xs text-white/60 print:text-black mt-1">
              {settings?.company_address || '123 Business Avenue'}
            </p>
            <p className="text-xs text-white/60 print:text-black">
              Phone: {settings?.company_phone || '+92 300 0000000'} | Email: {settings?.company_email || 'contact@pixelads.com'}
            </p>
          </div>

          <div className="text-right">
            <h2 className="font-heading font-black text-3xl text-white print:text-black">INVOICE</h2>
            <p className="font-mono text-sm text-orange-400 font-bold mt-1">#{order.order_code}</p>
            <p className="text-xs text-white/50 print:text-black mt-0.5">Date: {formatDate(order.created_at)}</p>
            <p className="text-xs text-white/50 print:text-black">Time: {formatTime(order.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="section-label mb-2">Order Information</div>
            <div className="space-y-1">
              <p className="text-white/80 print:text-black"><strong className="text-white/40 print:text-black">Project:</strong> {order.project_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/40 print:text-black font-semibold">Status:</span>
                <Badge variant={order.status}>{order.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>

          <div>
            <div className="section-label mb-2">Customer Details</div>
            <div className="space-y-1">
              <p className="text-white/80 print:text-black"><strong className="text-white/40 print:text-black">Name:</strong> {order.customer_name || 'N/A'}</p>
              <p className="text-white/80 print:text-black"><strong className="text-white/40 print:text-black">Phone:</strong> {order.customer_phone || 'N/A'}</p>
              <p className="text-white/80 print:text-black"><strong className="text-white/40 print:text-black">Email:</strong> {order.customer_email || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-glass w-full">
            <thead>
              <tr>
                <th>Description</th>
                <th>Project</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatOrderType(order.order_type)}</td>
                <td>{order.project_name}</td>
                <td className="text-center">1</td>
                <td className="text-right">{formatCurrency(order.total_amount)}</td>
                <td className="text-right font-bold text-white print:text-black">{formatCurrency(order.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-white/10 print:border-black">
          <div className="max-w-md text-xs text-white/50 print:text-black">
            {formatCleanNotes(order.clean_notes || order.notes) && (
              <div className="mb-4">
                <strong className="block text-white/70 print:text-black mb-1">Notes / Instructions:</strong>
                <p className="whitespace-pre-wrap">{formatCleanNotes(order.clean_notes || order.notes)}</p>
              </div>
            )}
            <p>{settings?.invoice_footer_notes || 'Thank you for your business.'}</p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5 print:border-black">
              <span className="text-white/60 print:text-black">Total Amount:</span>
              <span className="font-bold text-white print:text-black">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5 print:border-black">
              <span className="text-white/60 print:text-black">Advance Received:</span>
              <span className="font-bold text-green-400 print:text-black">{formatCurrency(order.advance_amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-white/10 print:border-black">
              <span className="font-heading font-bold text-white print:text-black">Remaining Balance:</span>
              <span className="font-heading font-black text-orange-400 print:text-black">{formatCurrency(order.pending_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
