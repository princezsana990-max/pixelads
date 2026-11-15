const nodemailer = require('nodemailer');
const env = require('../config/env');
const supabase = require('../config/supabase');

const createTransporter = () => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
};

const logEmail = async ({ order_id, recipient_email, recipient_name, event_type, subject, status, error_message, retry_count = 0 }) => {
  try {
    await supabase.from('email_logs').insert([
      {
        order_id: order_id || null,
        recipient_email,
        recipient_name: recipient_name || null,
        event_type,
        subject,
        status,
        error_message: error_message || null,
        retry_count,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      }
    ]);
  } catch (err) {
  }
};

const sendOrderNotification = async ({
  orderId,
  orderCode,
  projectName,
  customerName = 'Client',
  recipientEmail,
  recipientName = 'Staff Member',
  actorName = 'System',
  eventType,
  eventDescription,
  actionUrl,
  actionButtonText = 'Open Order in Pixel Ads',
  retries = 2
}) => {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { sent: false, reason: 'Invalid or missing recipient email' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    await logEmail({
      order_id: orderId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      event_type: eventType,
      subject: `Order Update: ${orderCode} - ${eventType}`,
      status: 'failed',
      error_message: 'SMTP not configured'
    });
    return { sent: false, reason: 'SMTP credentials missing' };
  }

  const formattedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const appUrl = env.CLIENT_URL.replace(/\/$/, '');
  const directLink = actionUrl ? `${appUrl}${actionUrl}` : `${appUrl}/admin/orders`;

  const subject = `[Pixel Ads] ${orderCode} - ${eventType}: ${projectName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border: 1.5px solid #000000; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #000000; padding: 20px 24px;">
        <span style="font-family: Calibri, sans-serif; font-size: 22px; font-weight: bold; color: #F97316;">PIXEL ADS</span>
        <span style="font-size: 12px; color: #9CA3AF; margin-left: 10px; text-transform: uppercase; letter-spacing: 1px;">Order Notification</span>
      </div>

      <div style="padding: 24px;">
        <h2 style="font-family: Calibri, sans-serif; font-size: 20px; color: #000000; margin-top: 0; margin-bottom: 8px;">
          ${eventType}
        </h2>
        <p style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">
          Hello <strong>${recipientName}</strong>,<br/>
          ${eventDescription}
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; background-color: #F9FAFB; width: 35%;">Order ID</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; color: #F97316;">${orderCode}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; background-color: #F9FAFB;">Project Name</td>
            <td style="padding: 10px; border: 1.5px solid #000000;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; background-color: #F9FAFB;">Customer Name</td>
            <td style="padding: 10px; border: 1.5px solid #000000;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; background-color: #F9FAFB;">Action Performed By</td>
            <td style="padding: 10px; border: 1.5px solid #000000;">${actorName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; background-color: #F9FAFB;">Date & Time</td>
            <td style="padding: 10px; border: 1.5px solid #000000;">${formattedDate}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${directLink}" style="display: inline-block; background-color: #F97316; color: #FFFFFF; font-family: Calibri, sans-serif; font-weight: bold; font-size: 15px; padding: 13px 30px; text-decoration: none; border-radius: 6px; border: 1.5px solid #F97316; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);">
            ${actionButtonText}
          </a>
        </div>

        <p style="font-size: 11px; color: #6B7280; text-align: center; margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 14px;">
          This is an automated operational alert generated by Pixel Ads Order Management System.
        </p>
      </div>
    </div>
  `;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      await transporter.sendMail({
        from: `"Pixel Ads Operations" <${env.SMTP_FROM}>`,
        to: recipientEmail,
        subject,
        html
      });

      await logEmail({
        order_id: orderId,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        event_type: eventType,
        subject,
        status: 'sent',
        retry_count: attempt
      });

      return { sent: true, attempts: attempt + 1 };
    } catch (err) {
      lastError = err.message;
      attempt++;
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  await logEmail({
    order_id: orderId,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    event_type: eventType,
    subject,
    status: 'failed',
    error_message: lastError,
    retry_count: attempt
  });

  return { sent: false, error: lastError, attempts: attempt };
};

const notifyOrderParticipants = async ({ order, eventType, eventDescription, actorName, actionUrl }) => {
  if (!order) return;

  const { data: fullOrder } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      project_name,
      customer_name,
      order_taker:users!orders_order_taker_id_fkey(id, name, email, username),
      assignments(
        is_active,
        editor:users!assignments_editor_id_fkey(id, name, email, username)
      )
    `)
    .eq('id', order.id)
    .single();

  if (!fullOrder) return;

  const recipients = [];

  const ot = fullOrder.order_taker;
  const otEmail = ot?.email || (ot?.username && ot.username.includes('@') ? ot.username : null);
  if (otEmail) {
    recipients.push({ email: otEmail, name: ot.name || 'Order Taker', role: 'order_taker' });
  }

  const activeAssignment = fullOrder.assignments?.find((a) => a.is_active);
  const ed = activeAssignment?.editor;
  const edEmail = ed?.email || (ed?.username && ed.username.includes('@') ? ed.username : null);
  if (edEmail) {
    recipients.push({ email: edEmail, name: ed.name || 'Video Editor', role: 'editor' });
  }

  for (const r of recipients) {
    await sendOrderNotification({
      orderId: fullOrder.id,
      orderCode: fullOrder.order_code,
      projectName: fullOrder.project_name,
      customerName: fullOrder.customer_name || 'Client',
      recipientEmail: r.email,
      recipientName: r.name,
      actorName: actorName || 'System',
      eventType,
      eventDescription,
      actionUrl: actionUrl || (r.role === 'editor' ? `/editor/orders/${fullOrder.id}` : `/order-taker/orders/${fullOrder.id}/review`)
    });
  }
};

const notifyAdminsOnNewOrder = async ({ order, orderTakerName }) => {
  if (!order) return;

  const { data: admins } = await supabase
    .from('users')
    .select('id, name, email, username, role')
    .eq('role', 'admin')
    .eq('is_blocked', false);

  if (!admins || admins.length === 0) return;

  for (const admin of admins) {
    const adminEmail = admin.email || (admin.username && admin.username.includes('@') ? admin.username : null);
    if (!adminEmail) continue;

    await sendOrderNotification({
      orderId: order.id,
      orderCode: order.order_code,
      projectName: order.project_name,
      customerName: order.customer_name || 'Client',
      recipientEmail: adminEmail,
      recipientName: admin.name || 'Admin',
      actorName: orderTakerName || 'Order Taker',
      eventType: 'New Order Pending Assignment',
      eventDescription: `A new order ${order.order_code} ("${order.project_name}") was submitted and needs an Editor assigned. Total: Rs. ${Number(order.total_amount || 0).toLocaleString()}, Advance: Rs. ${Number(order.advance_amount || 0).toLocaleString()}.`,
      actionUrl: `/admin/orders`,
      actionButtonText: 'Assign Editor Now'
    });
  }
};

module.exports = {
  sendOrderNotification,
  notifyOrderParticipants,
  notifyAdminsOnNewOrder
};
