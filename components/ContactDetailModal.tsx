'use client';

import { useEffect, useRef } from 'react';

interface ContactRow {
  id: number;
  created_at: string;
  email: string;
  type: '삭제요청' | '일반문의';
  target_service: string | null;
  message: string;
  status: '접수' | '처리완료';
}

interface ContactDetailModalProps {
  contact: ContactRow;
  onClose: () => void;
}

export default function ContactDetailModal({ contact, onClose }: ContactDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a, [tabindex]:not([tabindex="-1"])'
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

  const mailtoHref = `mailto:${contact.email}?subject=${encodeURIComponent(
    '[flint 문의 답변] ' + (contact.target_service ?? contact.type)
  )}&body=${encodeURIComponent('안녕하세요.\n\nflint 운영팀입니다.\n\n문의 주신 내용에 대해 답변 드립니다.\n\n')}`;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-detail-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="contact-detail-title" className="text-[17px] font-bold text-zinc-950 tracking-tight">
              문의 상세
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${contact.type === '삭제요청' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {contact.type}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${contact.status === '처리완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {contact.status}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1">이메일</p>
              <p className="text-sm font-medium text-zinc-900 break-all">{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1">접수일</p>
              <p className="text-sm text-zinc-700">{contact.created_at.split('T')[0].replace(/-/g, '.')}</p>
            </div>
          </div>

          {contact.target_service && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-1">대상 서비스</p>
              <p className="text-sm text-zinc-700 break-all">{contact.target_service}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-1.5">상세 내용</p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 min-h-[100px] max-h-[240px] overflow-y-auto">
              <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">{contact.message}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          <a
            href={mailtoHref}
            className="flex-1 h-10 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            이메일로 답변하기
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
