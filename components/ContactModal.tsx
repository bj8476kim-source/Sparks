'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ContactType = '삭제요청' | '일반문의';

interface ContactModalProps {
  onClose: () => void;
}

export default function ContactModal({ onClose }: ContactModalProps) {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<ContactType>('일반문의');
  const [targetService, setTargetService] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail || !trimmedMessage) {
      setError('이메일과 내용은 필수 입력 항목입니다.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    const { error: dbError } = await supabase.from('contacts').insert({
      email: trimmedEmail,
      type,
      target_service: targetService.trim() || null,
      message: trimmedMessage,
    });
    setSubmitting(false);

    if (dbError) {
      setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <div>
            <h2 id="contact-modal-title" className="text-[17px] font-bold text-zinc-950 tracking-tight">
              콘텐츠 수정/삭제 문의
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">접수 후 검토하여 빠르게 처리드립니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors mt-0.5"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-zinc-950 mb-1">접수되었습니다</p>
            <p className="text-sm text-zinc-400 mb-6">담당자 검토 후 조치하겠습니다.</p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            <div>
              <label htmlFor="contact-email" className="block text-xs font-semibold text-zinc-500 mb-1.5">
                이메일 주소 <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="contact-type" className="block text-xs font-semibold text-zinc-500 mb-1.5">
                문의 유형 <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <select
                  id="contact-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                  className="w-full h-10 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                >
                  <option value="일반문의">일반문의</option>
                  <option value="삭제요청">삭제요청 (DMCA)</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="contact-target" className="block text-xs font-semibold text-zinc-500 mb-1.5">
                대상 서비스명 / URL <span className="text-zinc-300 font-normal">(선택)</span>
              </label>
              <input
                id="contact-target"
                type="text"
                value={targetService}
                onChange={(e) => setTargetService(e.target.value)}
                placeholder="서비스 이름 또는 URL"
                maxLength={300}
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs font-semibold text-zinc-500 mb-1.5">
                상세 내용 <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="문의 내용을 자세히 작성해주세요."
                maxLength={2000}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
              />
              <p className="text-right text-[11px] text-zinc-300 mt-1">{message.length} / 2000</p>
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1 pb-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? '제출 중...' : '문의 제출'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
