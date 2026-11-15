import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettingsApi, updateSettingsApi } from '../api/settings';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    company_name: 'Pixel Ads',
    company_logo_url: '',
    company_address: '123 Business Avenue',
    company_phone: '+1 800 000 0000',
    company_email: 'contact@pixelads.com',
    invoice_footer_notes: 'Thank you for choosing Pixel Ads.'
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getSettingsApi();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (payload) => {
    const updated = await updateSettingsApi(payload);
    setSettings(updated);
    return updated;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
