import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Check, CheckCheck, Mic, Paperclip, X,
  Download, Image, Film, FileText, Reply, CornerDownRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOrderMessagesApi, sendOrderMessageApi, markMessagesReadApi } from '../../api/orders';
import { apiClient } from '../../api/client';
import { supabase } from '../../utils/supabaseClient';
import { formatTime } from '../../utils/formatters';
import { AudioPlayer } from './AudioPlayer';
import { VoiceRecorder } from './VoiceRecorder';

const MessageTicks = ({ status }) => {
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-white/50 shrink-0" />;
  }
  return <Check className="w-3.5 h-3.5 text-white/40 shrink-0" />;
};

export const OrderChat = ({ orderId, isLocked = false }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getOrderMessagesApi(orderId);
      setMessages(data || []);
      try {
        await apiClient(`/orders/${orderId}/messages/delivered`, { method: 'PATCH' });
        await markMessagesReadApi(orderId);
      } catch {
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase.channel(`order-chat-${orderId}`);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      }, async (payload) => {
        const newMsg = payload.new;
        const { data: senderData } = await supabase
          .from('users')
          .select('id, name, username, role')
          .eq('id', newMsg.sender_id)
          .single();

        const formatted = { ...newMsg, sender: senderData || { name: 'User' } };
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, formatted]);

        if (newMsg.sender_id !== user?.id) {
          try {
            await apiClient(`/orders/${orderId}/messages/delivered`, { method: 'PATCH' });
            await markMessagesReadApi(orderId);
          } catch {
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== user?.id) {
          setTypingUser(payload.payload.userName);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, user?.id]);

  const handleTyping = () => {
    supabase.channel(`order-chat-${orderId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user?.id, userName: user?.name }
    });
  };

  const handleSendText = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;

    const content = text.trim();
    setText('');
    setSending(true);

    try {
      await sendOrderMessageApi(orderId, {
        type: 'text',
        content,
        reply_to_id: replyTo?.id || undefined,
      });
      setReplyTo(null);
    } catch {
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendVoice = async (audioUrl, duration) => {
    try {
      await sendOrderMessageApi(orderId, {
        type: 'voice',
        content: audioUrl,
        duration,
        reply_to_id: replyTo?.id || undefined,
      });
      setShowRecorder(false);
      setReplyTo(null);
    } catch {
    }
  };

  return (
    <div
      className="flex flex-col h-[600px] rounded-2xl overflow-hidden glass-card p-0"
      style={{ border: '1.5px solid var(--glass-border)' }}
    >
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-heading font-bold text-sm text-white">Project Chat</span>
        </div>
        {typingUser && (
          <span className="text-xs text-orange-400 animate-fade-in font-heading">
            {typingUser} is typing...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/35 text-sm">
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm">
            <span>No messages yet</span>
            <span className="text-xs text-white/20 mt-1">Start collaborating on this project</span>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {!isMe && (
                  <span className="text-[10px] text-white/40 mb-1 ml-1 font-heading font-semibold">
                    {msg.sender?.name}
                  </span>
                )}

                <div className={`relative ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                  {msg.reply_to && (
                    <div className="mb-2 p-1.5 rounded-lg bg-black/20 border-l-2 border-orange-400 text-xs text-white/60">
                      <span className="text-orange-400 text-[10px] block font-heading font-bold">
                        {msg.reply_to.sender?.name || 'Reply'}
                      </span>
                      <span className="line-clamp-1">{msg.reply_to.content}</span>
                    </div>
                  )}

                  {msg.type === 'voice' ? (
                    <AudioPlayer src={msg.content} initialDuration={msg.duration || 0} />
                  ) : msg.type === 'image' ? (
                    <div>
                      <img src={msg.file_url || msg.content} alt="Attachment" className="max-w-xs rounded-lg mb-1 object-cover" />
                      <a href={msg.file_url || msg.content} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}

                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/50' : 'text-white/40'} text-[10px]`}>
                    <span>{formatTime(msg.created_at)}</span>
                    {isMe && <MessageTicks status={msg.delivery_status || 'sent'} />}
                  </div>

                  <button
                    onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                    className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/60 text-white/70 hover:text-white transition-opacity"
                    title="Reply"
                  >
                    <Reply className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2 text-xs text-white/70 overflow-hidden">
            <CornerDownRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="font-heading font-bold text-orange-400 shrink-0">Replying to {replyTo.sender?.name}:</span>
            <span className="truncate text-white/50">{replyTo.content}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!isLocked && (
        <div className="p-3 border-t border-white/10">
          {showRecorder ? (
            <VoiceRecorder
              onRecorded={handleSendVoice}
              onCancel={() => setShowRecorder(false)}
            />
          ) : (
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecorder(true)}
                className="p-2.5 rounded-xl text-white/50 hover:text-orange-400 hover:bg-white/10 transition-colors"
                title="Record voice message"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={e => { setText(e.target.value); handleTyping(); }}
                placeholder="Type a message..."
                className="glass-input flex-1 py-2 text-sm"
              />

              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="btn-primary p-2.5 rounded-xl disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
