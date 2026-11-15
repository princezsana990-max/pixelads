const supabase = require('../src/config/supabase');
const { hashPassword } = require('../src/utils/password');

async function seed() {
  const adminHash = await hashPassword('admin123');
  const userHash = await hashPassword('password123');

  await supabase.from('settings').upsert({
    id: 1,
    company_name: 'Pixel Ads',
    company_logo_url: '',
    company_address: '123 Business Avenue, Suite 400',
    company_phone: '+1 800 555 0199',
    company_email: 'admin@pixelads.com',
    invoice_footer_notes: 'Thank you for choosing Pixel Ads. Please retain this invoice for your records.'
  });

  await supabase.from('users').upsert([
    {
      employee_id: 'EMP-1000',
      name: 'Super Admin',
      phone: '+1 800 555 0100',
      username: 'admin',
      password_hash: adminHash,
      role: 'admin',
      is_blocked: false
    },
    {
      employee_id: 'EMP-1001',
      name: 'Alex Rivera',
      phone: '+1 800 555 0101',
      username: 'alex_ot',
      password_hash: userHash,
      role: 'order_taker',
      is_blocked: false
    },
    {
      employee_id: 'EMP-1002',
      name: 'Marcus Chen',
      phone: '+1 800 555 0102',
      username: 'marcus_editor',
      password_hash: userHash,
      role: 'editor',
      is_blocked: false
    }
  ], { onConflict: 'username' });

  process.exit(0);
}

seed().catch(() => process.exit(1));
