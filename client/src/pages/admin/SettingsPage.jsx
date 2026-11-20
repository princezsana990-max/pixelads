import React, { useState, useEffect } from 'react';
import { Building2, Save, Upload, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { getSignedUploadUrlApi } from '../../api/settings';
import { uploadFileToR2OrSupabase } from '../../utils/videoUploader';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const toast = useToast();

  const [formData, setFormData] = useState({
    company_name: '',
    company_logo_url: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    invoice_footer_notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || 'Pixel Ads',
        company_logo_url: settings.company_logo_url || '',
        company_address: settings.company_address || '123 Business Avenue',
        company_phone: settings.company_phone || '+92 300 0000000',
        company_email: settings.company_email || 'contact@pixelads.com',
        invoice_footer_notes: settings.invoice_footer_notes || 'Thank you for your business.'
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);

    try {
      const fileName = `logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const signData = await getSignedUploadUrlApi(fileName, 'branding', file.type);

      await uploadFileToR2OrSupabase({
        file,
        path: signData.path,
        token: signData.token,
        signedUrl: signData.signedUrl,
        provider: signData.provider || 'r2',
        bucket: 'branding',
        contentType: file.type || 'image/png'
      });

      setFormData((prev) => ({ ...prev, company_logo_url: signData.publicUrl || signData.path }));
      toast.success('Logo uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateSettings(formData);
      toast.success('Company settings and branding updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">
          Company Settings & Branding
        </h1>
        <p className="page-subtitle">
          Configure enterprise branding, operational contact details, and invoice footer legal remarks
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 glass-panel rounded-xl flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 glass-card flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
              {formData.company_logo_url ? (
                <img
                  src={formData.company_logo_url}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 text-white/40" />
              )}
            </div>

            <div className="space-y-2 flex-1 text-center sm:text-left">
              <span className="block section-label">
                Company Brand Logo
              </span>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <span className="btn-secondary text-xs py-1.5 px-3">
                    <Upload className="w-3.5 h-3.5 mr-1 text-orange-400" />
                    {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                  </span>
                </label>
                {formData.company_logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, company_logo_url: '' }))}
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-white/40">
                Supports PNG, JPG, SVG. Appears on topbar, invoices, and PDF exports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />

            <Input
              label="Official Contact Email *"
              type="email"
              value={formData.company_email}
              onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
              required
            />

            <Input
              label="Official Business Phone *"
              value={formData.company_phone}
              onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
              required
            />

            <Input
              label="Corporate Headquarters Address *"
              value={formData.company_address}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              required
            />
          </div>

          <Textarea
            label="Default Invoice Footer / Legal Notes"
            value={formData.invoice_footer_notes}
            onChange={(e) => setFormData({ ...formData, invoice_footer_notes: e.target.value })}
            rows={3}
            placeholder="Thank you for choosing Pixel Ads. Please retain this invoice for your tax and accounting records."
          />

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="px-6"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
