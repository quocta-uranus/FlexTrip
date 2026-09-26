'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { twoFactorCodeSchema, type TwoFactorCodeInput } from '@/lib/validators/auth.schema';
import { authApi } from '@/lib/api/client';
import type { TwoFactorSetup, TwoFactorEnableResult } from '@/types/auth';

interface Props {
  onClose: () => void;
  onEnabled: () => void;
}

type Step = 'loading' | 'scan' | 'verify' | 'recovery' | 'error';

export function TwoFactorSetupModal({ onClose, onEnabled }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [result, setResult] = useState<TwoFactorEnableResult | null>(null);
  const [apiError, setApiError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<TwoFactorCodeInput>({
    resolver: zodResolver(twoFactorCodeSchema),
  });

  useEffect(() => {
    authApi
      .setup2fa()
      .then((data) => {
        setSetup(data);
        setStep('scan');
      })
      .catch((e: Error) => {
        setApiError(e.message);
        setStep('error');
      });
  }, []);

  async function onVerify({ code }: TwoFactorCodeInput) {
    setVerifying(true);
    setApiError('');
    try {
      const r = await authApi.enable2fa(code);
      setResult(r);
      setStep('recovery');
      onEnabled();
    } catch (e: unknown) {
      setApiError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  function copySecret() {
    if (setup?.secret) {
      navigator.clipboard.writeText(setup.secret).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,41,0.5)' }}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-[#121A2C] dark:text-white dark:border-white/10"
        style={{ borderColor: '#e2e8f3' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#e2e8f3' }}>
          <div>
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
              AUTH-04
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {step === 'recovery' ? 'Mã khôi phục' : 'Bật xác thực 2 bước'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-[#f1f5fa]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#8694ad" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Loading */}
          {step === 'loading' && (
            <div className="flex justify-center py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: '#e2e8f3', borderTopColor: '#2a7bd9' }}
              />
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="py-4 text-center">
              <p className="text-sm" style={{ color: '#dc2626' }}>{apiError}</p>
              <button onClick={onClose} className="mt-4 text-sm font-medium" style={{ color: '#2a7bd9' }}>
                Đóng
              </button>
            </div>
          )}

          {/* Scan QR */}
          {step === 'scan' && setup && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Quét mã QR bên dưới bằng ứng dụng Authenticator (Google Authenticator, Authy…).
              </p>

              {setup.qrDataUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrDataUrl}
                    alt="QR Code 2FA"
                    className="rounded-lg border p-2"
                    style={{ borderColor: '#e2e8f3', width: 180, height: 180 }}
                  />
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Hoặc nhập mã thủ công:
                </p>
                <div
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{ borderColor: '#e2e8f3', background: '#f1f5fa' }}
                >
                  <code className="flex-1 text-sm font-mono text-slate-900 dark:text-slate-100">
                    {setup.secret}
                  </code>
                  <button onClick={copySecret} className="shrink-0 text-xs font-semibold" style={{ color: '#2a7bd9' }}>
                    {copied ? '✓ Đã copy' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                style={{ background: '#2a7bd9' }}
              >
                Tiếp theo — Nhập mã xác thực
              </button>
            </div>
          )}

          {/* Verify code */}
          {step === 'verify' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Nhập mã 6 chữ số từ ứng dụng Authenticator để xác nhận thiết lập.
              </p>

              {apiError && (
                <div
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
                >
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
                <div>
                  <input
                    {...register('code')}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="w-full rounded-lg border bg-white px-4 py-3 text-center text-2xl font-bold outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/30 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                    style={{ borderColor: '#e2e8f3', color: '#0f1729', letterSpacing: '0.4em' }}
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.code.message}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('scan')}
                    className="flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-[#f1f5fa]"
                    style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ background: '#2a7bd9' }}
                  >
                    {verifying ? 'Đang xác thực…' : 'Kích hoạt 2FA'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Recovery codes */}
          {step === 'recovery' && result && (
            <div className="space-y-4">
              <div
                className="rounded-lg border px-4 py-3 text-sm"
                style={{ borderColor: 'rgba(146,238,232,0.5)', background: 'rgba(146,238,232,0.15)', color: '#1e5aa8' }}
              >
                2FA đã được bật thành công!
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  Mã khôi phục (lưu lại ngay, chỉ hiện một lần):
                </p>
                <div
                  className="rounded-lg border p-3"
                  style={{ borderColor: '#e2e8f3', background: '#f1f5fa' }}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {result.recoveryCodes.map((code) => (
                      <code key={code} className="text-xs font-mono text-slate-900 dark:text-slate-100">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Mỗi mã chỉ dùng được một lần. Lưu vào nơi an toàn.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                style={{ background: '#2a7bd9' }}
              >
                Hoàn tất
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
