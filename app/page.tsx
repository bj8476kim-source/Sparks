'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import ContactModal from '@/components/ContactModal';
import type { CollectionWithServices, Service } from '@/types/database';

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  '재미': 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  '게임': 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  '창작': 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  '일상': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  '공부': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  '비즈니스': 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
};

export default function Home() {
  const [collections, setCollections] = useState<CollectionWithServices[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<number[]>([]);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    async function fetchData() {
      const [colRes, countRes] = await Promise.all([
        supabase
          .from('collections')
          .select(`id, title, description, slug, created_at, collection_services(sort_order, ai_services(id, name, url, description, category, upvotes, thumbnail_gradient, thumbnail_url))`)
          .order('created_at', { ascending: false }),
        supabase
          .from('ai_services')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
      ]);

      if (colRes.data) setCollections(colRes.data as unknown as CollectionWithServices[]);
      if (countRes.count !== null) setTotalCount(countRes.count);
      setLoading(false);
    }

    fetchData();
    const localVotes = localStorage.getItem('sparks_votes');
    if (localVotes) {
      try { setVotedIds(JSON.parse(localVotes)); } catch {}
    }
  }, []);

  const handleUpvote = async (e: React.MouseEvent, serviceId: number) => {
    e.stopPropagation();
    if (votedIds.includes(serviceId) || votingId === serviceId) {
      if (votedIds.includes(serviceId)) showToast('이미 추천하신 서비스입니다.', 'info');
      return;
    }
    setVotingId(serviceId);
    const { error } = await supabase.rpc('increment_upvote', { service_id: serviceId });
    setVotingId(null);
    if (error) {
      showToast('추천에 실패했습니다.', 'error');
    } else {
      const updated = [...votedIds, serviceId];
      setVotedIds(updated);
      localStorage.setItem('sparks_votes', JSON.stringify(updated));
      setCollections((prev) =>
        prev.map((col) => ({
          ...col,
          collection_services: col.collection_services.map((cs) => ({
            ...cs,
            ai_services: cs.ai_services.map((s) =>
              s.id === serviceId ? { ...s, upvotes: s.upvotes + 1 } : s
            ),
          })),
        }))
      );
    }
  };

  const getServices = (col: CollectionWithServices): Service[] =>
    col.collection_services
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((cs) => cs.ai_services)
      .filter((s): s is Service => s !== null && s !== undefined);

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 selection:bg-violet-500/10" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
      <Header />

      <main id="main-content">
        {/* Hero */}
        <section className="relative py-16 sm:py-20 text-center px-6 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.08), transparent)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs font-semibold text-violet-700">✨ 일반인이 AI로 만든 서비스 모음</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-950 tracking-tight leading-[1.1] mb-4">
              평범한 아이디어가
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">진짜 서비스가 됩니다</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-500 mb-8 max-w-lg mx-auto leading-relaxed">
              코딩 몰라도 괜찮아요. AI로 세상에 없던 서비스를 만들어낸 사람들의 창의적인 결과물을 발견해 보세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 h-12 px-7 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-base font-bold rounded-2xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-violet-300/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                서비스 등록하기
              </Link>
              <Link
                href="/all"
                className="inline-flex items-center gap-2 h-12 px-6 bg-white border border-zinc-200 hover:border-violet-300 hover:bg-violet-50/50 text-zinc-700 hover:text-violet-700 text-base font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                전체 서비스 보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs font-medium text-zinc-400">
              <span><strong className="text-zinc-700 font-semibold">{totalCount}+</strong> 개의 서비스</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" aria-hidden="true" />
              <span><strong className="text-zinc-700 font-semibold">6</strong>개 카테고리</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" aria-hidden="true" />
              <span><strong className="text-zinc-700 font-semibold">일반인</strong>이 직접 제작</span>
            </div>
          </div>
        </section>

        {/* Collections */}
        <section className="pb-24 space-y-16">
          {/* Loading skeleton */}
          {loading && (
            <div className="max-w-[1200px] mx-auto px-6 space-y-16">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-7 w-48 bg-zinc-200 rounded-xl mb-6" />
                  <div className="flex gap-5 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="shrink-0 w-72 h-72 bg-white border border-zinc-200 rounded-2xl shadow-lg shadow-violet-100/40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && collections.length === 0 && (
            <div className="max-w-[1200px] mx-auto px-6 py-16 text-center">
              <p className="text-4xl mb-4">🔮</p>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">큐레이션 컬렉션 준비 중</h2>
              <p className="text-sm text-zinc-500 mb-6">곧 테마별 AI 서비스 컬렉션을 선보일게요.</p>
              <Link
                href="/all"
                className="inline-flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                전체 서비스 보기 →
              </Link>
            </div>
          )}

          {/* Collection rows */}
          {!loading && collections.map((col) => {
            const services = getServices(col);
            if (services.length === 0) return null;
            return (
              <div key={col.id}>
                {/* Section header */}
                <div className="max-w-[1200px] mx-auto px-6 flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">{col.title}</h2>
                    {col.description && (
                      <p className="text-sm text-zinc-500 mt-1">{col.description}</p>
                    )}
                  </div>
                  <Link
                    href="/all"
                    className="shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                  >
                    전체보기
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Horizontal scroll row */}
                <div
                  className="relative"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
                    maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
                  }}
                >
                  <div className="flex gap-5 overflow-x-auto pb-4 px-6 scrollbar-hide scroll-smooth snap-x snap-mandatory">
                    {services.map((service) => {
                      const hasVoted = votedIds.includes(service.id);
                      const isVoting = votingId === service.id;
                      return (
                        <div
                          key={service.id}
                          role="link"
                          tabIndex={0}
                          onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(service.url, '_blank', 'noopener,noreferrer'); } }}
                          aria-label={`${service.name} - 새 탭에서 열기`}
                          className="group snap-start shrink-0 w-72 bg-white border border-zinc-200 rounded-2xl shadow-lg shadow-violet-100/40 hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden flex flex-col"
                        >
                          {/* Thumbnail */}
                          <div className={`relative h-40 bg-gradient-to-br ${service.thumbnail_gradient} overflow-hidden shrink-0`}>
                            {service.thumbnail_url ? (
                              <Image
                                src={service.thumbnail_url}
                                alt={service.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="288px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white/20 text-6xl font-black select-none" aria-hidden="true">
                                  {service.name[0]}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Card body */}
                          <div className="p-4 flex flex-col flex-1 justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-1.5 ${CATEGORY_BADGE_STYLES[service.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                    {service.category}
                                  </span>
                                  <h3 className="text-[15px] font-bold text-zinc-950 leading-snug tracking-tight truncate">
                                    {service.name}
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleUpvote(e, service.id)}
                                  disabled={isVoting}
                                  aria-pressed={hasVoted}
                                  aria-label={`추천 ${service.upvotes}개`}
                                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 border shadow-sm disabled:opacity-60 ${
                                    hasVoted
                                      ? 'bg-rose-600 border-rose-600 text-white cursor-default'
                                      : 'bg-rose-50/50 border-rose-100/70 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                                  }`}
                                >
                                  {isVoting ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                  )}
                                  <span className="text-[10px] font-extrabold leading-none">{service.upvotes}</span>
                                </button>
                              </div>
                              <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">
                                {service.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3">
                              <span>방문하기</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50">
        <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-xl">
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              Sparks는 유용한 AI 서비스를 소개하는 큐레이션 플랫폼입니다. 등록된 콘텐츠의 저작권은 원저작자에게 있으며,{' '}
              <strong className="font-semibold text-zinc-700">권리자 요청 시 즉시 삭제 또는 수정</strong>됩니다.
            </p>
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              콘텐츠 수정/삭제 문의
            </button>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none" aria-hidden="true">⚡</span>
            <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>Sparks</span>
          </div>
          <p className="text-xs text-zinc-400">© 2026 Sparks. All rights reserved.</p>
          <nav aria-label="푸터 링크" className="flex items-center gap-5">
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Terms of Service</a>
          </nav>
        </div>
      </footer>

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  );
}
