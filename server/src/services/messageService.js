const supabase = require('../config/supabase');
const emailService = require('./emailService');

const listMessages = async (orderId) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      order_id,
      sender_id,
      message_type,
      content,
      audio_url,
      audio_duration,
      file_url,
      file_name,
      file_size,
      file_type,
      delivery_status,
      delivered_at,
      read_at,
      is_read,
      reply_to_id,
      created_at,
      sender:users!messages_sender_id_fkey(id, name, username, role),
      reply_to:messages!messages_reply_to_id_fkey(id, content, message_type, sender:users!messages_sender_id_fkey(name))
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('messages')
      .select(`
        id,
        order_id,
        sender_id,
        message_type,
        content,
        audio_url,
        audio_duration,
        is_read,
        created_at,
        sender:users!messages_sender_id_fkey(id, name, username, role)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (fallbackErr) throw new Error(fallbackErr.message);
    return fallbackData || [];
  }

  return data || [];
};

const sendMessage = async (orderId, senderId, {
  message_type = 'text',
  content = '',
  audio_url = null,
  audio_duration = 0,
  file_url = null,
  file_name = null,
  file_size = 0,
  file_type = null,
  reply_to_id = null
}) => {
  const insertPayload = {
    order_id: orderId,
    sender_id: senderId,
    message_type,
    content: content || null,
    audio_url: audio_url || null,
    audio_duration: audio_duration || 0,
    is_read: false
  };

  if (file_url) insertPayload.file_url = file_url;
  if (file_name) insertPayload.file_name = file_name;
  if (file_size) insertPayload.file_size = file_size;
  if (file_type) insertPayload.file_type = file_type;
  if (reply_to_id) insertPayload.reply_to_id = reply_to_id;

  let messageResult;

  const { data: message, error } = await supabase
    .from('messages')
    .insert([insertPayload])
    .select(`
      id,
      order_id,
      sender_id,
      message_type,
      content,
      audio_url,
      audio_duration,
      file_url,
      file_name,
      file_size,
      file_type,
      delivery_status,
      delivered_at,
      read_at,
      is_read,
      reply_to_id,
      created_at,
      sender:users!messages_sender_id_fkey(id, name, username, role)
    `)
    .single();

  if (error) {
    delete insertPayload.file_url;
    delete insertPayload.file_name;
    delete insertPayload.file_size;
    delete insertPayload.file_type;
    delete insertPayload.reply_to_id;

    const { data: fallbackMsg, error: fbErr } = await supabase
      .from('messages')
      .insert([insertPayload])
      .select(`
        id,
        order_id,
        sender_id,
        message_type,
        content,
        audio_url,
        audio_duration,
        is_read,
        created_at,
        sender:users!messages_sender_id_fkey(id, name, username, role)
      `)
      .single();

    if (fbErr) throw new Error(fbErr.message);
    messageResult = fallbackMsg;
  } else {
    messageResult = message;
  }

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      project_name,
      customer_name,
      order_taker_id,
      order_taker:users!orders_order_taker_id_fkey(id, name, email),
      assignments(editor_id, is_active, editor:users!assignments_editor_id_fkey(id, name, email))
    `)
    .eq('id', orderId)
    .single();

  if (order) {
    const targetUserId = senderId === order.order_taker_id
      ? order.assignments?.find((a) => a.is_active)?.editor_id
      : order.order_taker_id;

    if (targetUserId) {
      await supabase.from('notifications').insert([
        {
          user_id: targetUserId,
          title: `New Message: ${order.order_code}`,
          message: message_type === 'voice'
            ? 'Sent a voice message'
            : message_type === 'file' || message_type === 'image' || message_type === 'video'
              ? `Sent an attachment: ${file_name || 'media'}`
              : content.slice(0, 80),
          link: senderId === order.order_taker_id ? `/editor/orders/${orderId}` : `/order-taker/orders/${orderId}/review`
        }
      ]);
    }

    const recipient = senderId === order.order_taker_id
      ? order.assignments?.find((a) => a.is_active)?.editor
      : order.order_taker;

    if (recipient && recipient.email) {
      await emailService.sendOrderNotification({
        orderId: order.id,
        orderCode: order.order_code,
        projectName: order.project_name,
        customerName: order.customer_name || 'Client',
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        actorName: messageResult.sender?.name || 'Collaborator',
        eventType: 'New Chat Message',
        eventDescription: message_type === 'voice'
          ? 'Recorded a new voice note in the order chat.'
          : message_type === 'text'
            ? `Sent a message: "${content}"`
            : `Shared an attachment: ${file_name || 'media file'}`,
        actionUrl: senderId === order.order_taker_id ? `/editor/orders/${orderId}` : `/order-taker/orders/${orderId}/review`
      });
    }
  }

  return messageResult;
};

const markAsDelivered = async (orderId, currentUserId) => {
  try {
    await supabase
      .from('messages')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .neq('sender_id', currentUserId)
      .eq('delivery_status', 'sent');
  } catch (err) {
  }
  return true;
};

const markAsRead = async (orderId, currentUserId) => {
  try {
    await supabase
      .from('messages')
      .update({
        is_read: true,
        delivery_status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .neq('sender_id', currentUserId);
  } catch (err) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .neq('sender_id', currentUserId);
  }

  return true;
};

module.exports = {
  listMessages,
  sendMessage,
  markAsDelivered,
  markAsRead
};
