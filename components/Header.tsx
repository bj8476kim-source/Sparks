'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 transition-all">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Sparks 홈으로">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-zinc-950 tracking-tight">Sparks</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6" aria-label="주요 메뉴">
            <Link
              href="/"
              aria-current={pathname === '/' ? 'page' : undefined}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors aria-[current=page]:text-zinc-900"
            >
              전체 서비스
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors"
            aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        ref={drawerRef}
        className={`md:hidden overflow-hidden transition-all duration-200 ${mobileOpen ? 'max-h-48 border-t border-zinc-100' : 'max-h-0'}`}
      >
        <nav className="bg-white/95 backdrop-blur-md px-6 py-3 flex flex-col gap-1" aria-label="모바일 메뉴">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === '/' ? 'page' : undefined}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors aria-[current=page]:text-zinc-900 aria-[current=page]:bg-zinc-50"
          >
            전체 서비스
          </Link>
        </nav>
      </div>
    </header>
  );
}
