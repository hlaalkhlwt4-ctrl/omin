'use client';

import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type EmbeddedSignupData = { wabaId: string; phoneNumberId: string };
type FacebookLoginResponse = { authResponse?: { code?: string }; status?: string };
type FacebookSdk = {
  init(options: Record<string, unknown>): void;
  login(callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppConnectButton({ appId, configId, graphVersion }: { appId: string; configId: string; graphVersion: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const signupData = useRef<EmbeddedSignupData | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      let payload = event.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP' || payload?.event !== 'FINISH') return;
      const wabaId = String(payload.data?.waba_id || '');
      const phoneNumberId = String(payload.data?.phone_number_id || '');
      if (wabaId && phoneNumberId) signupData.current = { wabaId, phoneNumberId };
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  function initializeSdk() {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: graphVersion });
      setReady(true);
    };
    if (window.FB) window.fbAsyncInit();
  }

  function connect() {
    setMessage('');
    signupData.current = null;
    if (!window.FB) return setMessage('تعذر تحميل نافذة Meta. حاول مرة أخرى.');
    setPending(true);
    window.FB.login(async (response) => {
      const code = response.authResponse?.code;
      const data = signupData.current;
      if (!code || !data) {
        setPending(false);
        return setMessage('لم يكتمل الربط. أكمل جميع خطوات Meta ثم حاول مجددًا.');
      }
      try {
        const result = await fetch('/api/integrations/meta/whatsapp/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, ...data }),
        });
        const body = (await result.json()) as { error?: string };
        if (!result.ok) throw new Error(body.error || 'تعذر إكمال الربط.');
        router.push('/settings/integrations?connected=whatsapp');
        router.refresh();
      } catch (error) {
        setPending(false);
        setMessage(error instanceof Error ? error.message : 'تعذر إكمال الربط.');
      }
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
    });
  }

  return <>
    <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onLoad={initializeSdk} />
    <button type="button" onClick={connect} disabled={!ready || pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? 'جارٍ إكمال الربط…' : ready ? 'ربط رقم WhatsApp' : 'جارٍ تحميل Meta…'}
    </button>
    {message && <p className="mt-2 text-xs text-rose-600" role="alert">{message}</p>}
  </>;
}
