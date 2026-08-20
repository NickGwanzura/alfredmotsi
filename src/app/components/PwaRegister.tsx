'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  if (!installPrompt) return null;

  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white p-3 text-sm shadow-xl">
      <div>
        <p className="font-semibold text-gray-900">Install Splash Air</p>
        <p className="text-xs text-gray-500">Add the CRM to your Android home screen.</p>
      </div>
      <button type="button" onClick={install} className="min-h-10 rounded-lg border-none bg-brand-600 px-4 text-sm font-semibold text-white cursor-pointer hover:bg-brand-700">Install</button>
    </div>
  );
}
