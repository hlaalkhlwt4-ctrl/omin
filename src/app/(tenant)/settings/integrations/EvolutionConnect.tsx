'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Status = { configured?: boolean; state?: string; connected?: boolean };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`لم يُرجع الخادم أي تفاصيل (HTTP ${response.status}).`);
  try { return JSON.parse(text) as T; } catch { throw new Error(`استجابة الخادم غير صالحة (HTTP ${response.status}).`); }
}

export function EvolutionConnect({ initiallyConnected }: { initiallyConnected: boolean }) {
  const router = useRouter();
  const [connected, setConnected] = useState(initiallyConnected);
  const [state, setState] = useState(initiallyConnected ? 'open' : 'new');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const refreshStatus = useCallback(async () => {
    const response = await fetch('/api/integrations/evolution/status', { cache: 'no-store' });
    const body = await readJson<Status>(response);
    setState(body.state || 'close');
    if (body.connected) {
      setConnected(true);
      setQrCode(null);
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (connected || (!qrCode && state === 'new')) return;
    const timer = window.setInterval(() => void refreshStatus(), 4000);
    return () => window.clearInterval(timer);
  }, [connected, qrCode, refreshStatus, state]);

  async function connect() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/evolution/connect', { method: 'POST' });
      const body = await readJson<{ qrCode?: string | null; state?: string; error?: string }>(response);
      if (!response.ok) throw new Error(body.error || 'تعذر بدء الربط.');
      setQrCode(body.qrCode || null);
      setState(body.state || 'connecting');
      if (!body.qrCode) await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء الربط.');
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/evolution/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('تعذر فصل الرقم.');
      setConnected(false);
      setState('close');
      setQrCode(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فصل الرقم.');
    } finally {
      setPending(false);
    }
  }

  if (connected) return <div className="mt-4"><p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">رقم واتساب متصل عبر Evolution API</p><button type="button" onClick={disconnect} disabled={pending} className="mt-3 text-xs font-bold text-rose-600 disabled:opacity-50">{pending ? 'جارٍ الفصل…' : 'فصل الرقم'}</button>{error && <p className="mt-2 text-xs text-rose-600">{error}</p>}</div>;

  return <div className="mt-4">
    {qrCode ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center"><p className="mb-3 text-xs font-bold text-emerald-900">افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز، ثم امسح الرمز</p><Image src={qrCode} alt="رمز QR لربط واتساب" width={240} height={240} unoptimized className="mx-auto rounded-xl bg-white p-2" /><p className="mt-3 text-[11px] text-emerald-800">سيتم تحديث حالة الاتصال تلقائيًا.</p></div> : null}
    {!qrCode && <button type="button" onClick={connect} disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{pending ? 'جارٍ إنشاء جلسة الربط…' : state === 'close' ? 'إعادة ربط واتساب' : 'ربط واتساب عبر QR'}</button>}
    {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}
  </div>;
}
