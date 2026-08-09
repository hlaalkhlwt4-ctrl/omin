'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Send, Bot, User, Sparkles, Plus, X, MessageSquare,
  Phone, Mail, ShoppingBag, StickyNote, Clock, CheckCircle2,
  ChevronLeft, Filter, Loader2, Bookmark, AlertTriangle,
} from 'lucide-react';

interface ConvItem {
  id: string;
  status: string;
  unreadCount: number;
  aiEnabled: boolean;
  assignedUserId?: string | null;
  lastMessageAt: any;
  contact: { id: string; fullName: string; phone?: string | null; email?: string | null; stage: string };
  channel: { provider: string; name: string };
  messages: Array<{ id: string; body: string; senderType: string; createdAt: any }>;
}

interface SavedReplyItem {
  id: string;
  title: string;
  content: string;
  shortcut?: string | null;
}

interface InboxClientViewProps {
  initialConversations: ConvItem[];
  savedReplies: SavedReplyItem[];
  currentUserId: string;
  workspaceId: string;
  teamMembers: Array<{ id: string; fullName: string }>;
}

export function InboxClientView({
  initialConversations,
  savedReplies,
  currentUserId,
  workspaceId,
  teamMembers,
}: InboxClientViewProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversations[0]?.id || null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showSaved, setShowSaved] = useState(false);
  const [internalNote, setInternalNote] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiResultType, setAiResultType] = useState<'SUGGEST' | 'SUMMARY'>('SUGGEST');
  const [loadingAi, setLoadingAi] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvId) return;
    setLoadingMessages(true);
    fetch(`/api/inbox/messages?conversationId=${selectedConvId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        setNextCursor(data.nextCursor || null);
        setLoadingMessages(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => setLoadingMessages(false));
  }, [selectedConvId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler); };
  }, []);

  useEffect(() => {
    if (!selectedConvId) return;
    const timer = window.setInterval(async () => {
      if (!navigator.onLine) return;
      const response = await fetch(`/api/inbox/messages?conversationId=${selectedConvId}&limit=50`);
      if (!response.ok) return;
      const data = await response.json();
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        for (const message of data.messages || []) merged.set(message.id, message);
        return Array.from(merged.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [selectedConvId]);

  const loadOlderMessages = async () => {
    if (!selectedConvId || !nextCursor) return;
    const response = await fetch(`/api/inbox/messages?conversationId=${selectedConvId}&cursor=${nextCursor}&limit=50`);
    const data = await response.json();
    if (response.ok) {
      setMessages((current) => [...(data.messages || []), ...current]);
      setNextCursor(data.nextCursor || null);
    }
  };

  const updateConversation = async (changes: { assignedUserId?: string | null; status?: string }) => {
    if (!selectedConvId) return;
    const response = await fetch('/api/inbox/conversations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selectedConvId, ...changes }) });
    if (response.ok) setConversations((items) => items.map((item) => item.id === selectedConvId ? { ...item, ...changes } : item));
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConvId) return;
    setSending(true);
    try {
      const res = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          body: replyText,
          senderType: internalNote ? 'NOTE' : 'USER',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setReplyText('');
      setInternalNote(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleGetAiSuggestion = async (action: 'SUGGEST' | 'SUMMARY' = 'SUGGEST') => {
    if (!selectedConvId || !selectedConv) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/inbox/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تشغيل المساعد.');
      setAiResultType(action);
      setAiSuggestion(data.result || data.suggestedReply || '');
    } catch {
      setAiSuggestion('تعذر توليد الاقتراح حالياً.');
    } finally {
      setLoadingAi(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.contact.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contact.phone && c.contact.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProviderBadge = (provider: string) => {
    const map: Record<string, { color: string; label: string }> = {
      WHATSAPP: { color: 'bg-emerald-50 text-emerald-700', label: 'واتساب' },
      INSTAGRAM: { color: 'bg-purple-50 text-purple-700', label: 'إنستغرام' },
      FACEBOOK: { color: 'bg-blue-50 text-blue-700', label: 'فيسبوك' },
      EMAIL: { color: 'bg-red-50 text-red-700', label: 'بريد إلكتروني' },
      DEV_MOCK: { color: 'bg-slate-100 text-slate-600', label: 'محاكي تطويري' },
    };
    return map[provider] || map.DEV_MOCK;
  };

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
      {/* Column 1: Conversations List */}
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 hidden md:flex">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في المحادثات..."
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>
          <div className="flex gap-1 text-[10px] font-bold">
            {['ALL', 'OPEN', 'PENDING', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {s === 'ALL' ? 'الكل' : s === 'OPEN' ? 'مفتوح' : s === 'PENDING' ? 'معلق' : 'مغلق'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredConversations.map((conv) => {
            const badge = getProviderBadge(conv.channel.provider);
            const isSelected = selectedConvId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => { setSelectedConvId(conv.id); setAiSuggestion(''); }}
                className={`w-full p-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${
                  isSelected ? 'bg-brand-50/60 dark:bg-brand-950/40 border-r-2 border-brand-600' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 text-sm">
                    {conv.contact.fullName.substring(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {conv.contact.fullName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.messages[0]?.body || 'بداية المحادثة...'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">لا توجد محادثات مطابقة.</div>
          )}
        </div>
      </div>

      {/* Column 2: Messages & Reply */}
      <div className="flex-1 flex flex-col min-w-0">
        {!online && <div className="bg-amber-100 px-3 py-2 text-center text-xs font-bold text-amber-800">أنت غير متصل الآن. سيعود التحديث التلقائي عند استعادة الاتصال.</div>}
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedConv.contact.fullName}
                </h3>
                <span className="text-[10px] text-slate-500">
                  {selectedConv.contact.phone || selectedConv.contact.email} · {getProviderBadge(selectedConv.channel.provider).label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGetAiSuggestion('SUGGEST')}
                  disabled={loadingAi}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all"
                >
                  {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>اقتراح AI</span>
                </button>
                <button
                  onClick={() => handleGetAiSuggestion('SUMMARY')}
                  disabled={loadingAi}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg"
                >
                  تلخيص
                </button>
                <button
                  onClick={() => setShowSaved(!showSaved)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>ردود جاهزة</span>
                </button>
              </div>
            </div>

            {/* Saved Replies Dropdown */}
            {showSaved && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40 space-y-1">
                {savedReplies.length > 0 ? (
                  savedReplies.map((sr) => (
                    <button
                      key={sr.id}
                      onClick={() => { setReplyText(sr.content); setShowSaved(false); }}
                      className="w-full text-right p-2 bg-white dark:bg-slate-900 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{sr.title}</span>
                      <p className="text-slate-500 truncate">{sr.content}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-2">لا توجد ردود جاهزة. أضفها من الإعدادات.</p>
                )}
              </div>
            )}

            {/* AI Suggestion Banner */}
            {aiSuggestion && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiResultType === 'SUMMARY' ? 'ملخص المحادثة:' : 'اقتراح الذكاء الاصطناعي (مولّد آلياً):'}</span>
                </div>
                <p className="text-indigo-900 dark:text-indigo-200">{aiSuggestion}</p>
                {aiResultType === 'SUGGEST' && <button
                  onClick={() => { setReplyText(aiSuggestion); setAiSuggestion(''); }}
                  className="mt-2 px-3 py-1 bg-indigo-600 text-white font-bold text-[11px] rounded-lg"
                >
                  استخدم هذا الرد
                </button>}
              </div>
            )}

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
              {nextCursor && <div className="text-center"><button onClick={loadOlderMessages} className="rounded-lg bg-slate-200 px-3 py-1 text-[10px] font-bold dark:bg-slate-800">تحميل رسائل أقدم</button></div>}
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isContact = msg.senderType === 'CONTACT';
                  const isAi = msg.senderType === 'AI';
                  const isNote = msg.senderType === 'NOTE';
                  return (
                    <div key={msg.id} className={`flex ${isContact ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                          isNote
                            ? 'bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : isContact
                            ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-brand-600 text-white'
                        }`}
                      >
                        {isNote && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 mb-1">
                            <StickyNote className="w-3 h-3" />
                            <span>ملاحظة داخلية — لا تُرسل للعميل</span>
                          </div>
                        )}
                        {isAi && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-brand-200 mb-1">
                            <Sparkles className="w-3 h-3" />
                            <span>رد الذكاء الاصطناعي</span>
                          </div>
                        )}
                        <p className="whitespace-pre-line">{msg.body}</p>
                        <span className={`text-[9px] block text-left mt-1.5 ${isContact ? 'text-slate-400' : isNote ? 'text-amber-500' : 'text-brand-200'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  لا توجد رسائل في هذه المحادثة بعد.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => setInternalNote(!internalNote)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    internalNote
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <StickyNote className="w-3 h-3 inline mr-1" />
                  {internalNote ? 'ملاحظة داخلية' : 'رد عادي'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  placeholder={internalNote ? 'اكتب ملاحظة داخلية للفريق...' : 'اكتب ردك هنا...'}
                  className="flex-1 px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
              <p>اختر محادثة من القائمة لعرض الرسائل</p>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Contact Context Sidebar (desktop only) */}
      {selectedConv && (
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-4 hidden lg:block overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center">
                {selectedConv.contact.fullName.substring(0, 1)}
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {selectedConv.contact.fullName}
                </span>
                <span className="text-[10px] text-brand-600 font-bold">{selectedConv.contact.stage}</span>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              {selectedConv.contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-500" />
                  <span>{selectedConv.contact.phone}</span>
                </div>
              )}
              {selectedConv.contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-500" />
                  <span>{selectedConv.contact.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase">إجراءات سريعة</h4>
            <a
              href={`/contacts/${selectedConv.contact.id}`}
              className="block w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-center hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              عرض ملف العميل الكامل
            </a>
            <a
              href={`/orders?contactId=${selectedConv.contact.id}&conversationId=${selectedConv.id}`}
              className="block w-full p-2 bg-brand-50 dark:bg-brand-950 text-brand-700 rounded-lg text-xs font-bold text-center hover:bg-brand-100"
            >
              إنشاء طلب من المحادثة
            </a>
            <label className="block text-[11px] font-bold text-slate-500">تعيين الموظف<select value={selectedConv.assignedUserId || ''} onChange={(event) => updateConversation({ assignedUserId: event.target.value || null })} className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700"><option value="">غير معيّن</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
            <label className="block text-[11px] font-bold text-slate-500">حالة المحادثة<select value={selectedConv.status} onChange={(event) => updateConversation({ status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700"><option value="OPEN">مفتوحة</option><option value="PENDING">معلقة</option><option value="CLOSED">مغلقة</option></select></label>
          </div>
        </div>
      )}
    </div>
  );
}
