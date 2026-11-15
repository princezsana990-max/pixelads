import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createOrderApi } from '../../api/orders';
import { getUsersApi } from '../../api/users';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { DirectUploader } from '../../components/shared/DirectUploader';
import { formatCurrency } from '../../utils/formatters';

export const NewOrderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const [orderTakers, setOrderTakers] = useState([]);
  const [selectedOrderTakerId, setSelectedOrderTakerId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [script, setScript] = useState('');
  const [notes, setNotes] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      getUsersApi({ role: 'order_taker', limit: 100 })
        .then(res => setOrderTakers(res.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const numTotal = parseFloat(totalAmount) || 0;
  const numAdvance = parseFloat(advanceAmount) || 0;
  const pendingAmount = Math.max(0, numTotal - numAdvance);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!projectName.trim()) { setError('Project name is required'); return; }
    if (!script.trim()) { setError('Script is required'); return; }
    setLoading(true);
    try {
      const newOrder = await createOrderApi({
        order_taker_id: (isAdmin && selectedOrderTakerId) ? selectedOrderTakerId : undefined,
        project_name: projectName.trim(),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        script: script.trim(),
        notes: notes.trim(),
        total_amount: numTotal,
        advance_amount: numAdvance,
        files,
      });

      if (isAdmin) {
        navigate(`/admin/orders`);
      } else {
        navigate(`/order-taker/orders/${newOrder.id}/invoice`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">{isAdmin ? 'Admin Manual Order Entry' : 'New Order Entry'}</h1>
        <p className="page-subtitle">
          {isAdmin 
            ? 'Manually enter an order for any Order Taker or your administrative desk' 
            : 'Complete all project details, script, media, and payment terms'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/12 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        <div className="glass-card p-5 space-y-3">
          <div className="section-label mb-2">Order Identification</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isAdmin ? (
              <Select
                label="Assign to Order Taker"
                value={selectedOrderTakerId}
                onChange={e => setSelectedOrderTakerId(e.target.value)}
              >
                <option value="">Admin (Direct Self-Entry)</option>
                {orderTakers.map(ot => (
                  <option key={ot.id} value={ot.id}>
                    {ot.name} ({ot.employee_id})
                  </option>
                ))}
              </Select>
            ) : (
              <Input label="Order Taker" value={`${user?.name} (${user?.employee_id})`} readOnly />
            )}
            <Input label="Date" value={currentDate} readOnly />
            <Input label="Time" value={currentTime} readOnly />
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="section-label">Customer Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name or company" />
            <Input label="Customer Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+92..." />
            <Input label="Customer Email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="section-label">Project Details</div>
          <Input
            label="Project Name"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. Summer Real Estate Video Promo"
            required
          />
          <Textarea
            label="Project Script"
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Full narration, timestamps, scene instructions, text overlays..."
            rows={6}
            required
          />
          <DirectUploader
            files={files}
            onChange={setFiles}
            label="Project Media (Videos, Images, Assets)"
          />
          <Textarea
            label="Notes or Remarks"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Delivery instructions, aspect ratio, music preferences..."
            rows={3}
          />
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="section-label">Payment Details (PKR)</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Total Amount (Rs.)"
              type="number"
              min="0"
              step="1"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="0"
              required
            />
            <Input
              label="Advance Received (Rs.)"
              type="number"
              min="0"
              step="1"
              value={advanceAmount}
              onChange={e => setAdvanceAmount(e.target.value)}
              placeholder="0"
              required
            />
            <div>
              <label className="form-label">Pending Balance</label>
              <div
                className="glass-input font-heading font-black text-orange-500"
                style={{ cursor: 'default' }}
              >
                {formatCurrency(pendingAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pb-4">
          <Button type="button" variant="secondary" onClick={() => navigate(isAdmin ? '/admin/orders' : '/order-taker/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Submit Order
          </Button>
        </div>
      </form>
    </div>
  );
};
