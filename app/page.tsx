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
  '재미': 'bg-orange-50 text-orange-700',
  '게임': 'bg-violet-50 text-violet-700',
  '창작': 'bg-blue-50 text-blue-700',
  '일상': 'bg-emerald-50 text-emerald-700',
  '공부': 'bg-amber-50 text-amber-700',
  '비즈니스': 'bg-rose-50 text-rose-700',
};

const RANK_COLORS = [
  'bg-gradient-to-b from-violet-600 to-indigo-600 text-white',
  'bg-gradient-to-b from-violet-400 to-indigo-400 text-white',
  'bg-gradient-to-b from-violet-300 to-indigo-300 text-white',
  'bg-zinc-100 text-zinc-500',
  'bg-zinc-100 text-zinc-500',
];

export default function Home() {
  const [collection, setCollection] = useState<CollectionWithServices | null>(null);
  const [topServices, setTopServices] = useState<Service[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [votedIds, setVotedIds] = useState<number[]>([]);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const showToast = useToast();

  const CATEGORIES = ['전체', '재미', '게임', '창작', '일상', '공부', '비즈니스'];

  useEffect(() => {
    async function fetchData() {
      const [colRes, topRes, countRes] = await Promise.all([
        supabase
          .from('collections')
          .select(`id, title, priority, created_at, collection_services(sort_order, ai_services(id, name, url, description, category, upvotes, thumbnail_gradient, thumbnail_url))`)
          .order('priority', { ascending: true })
          .limit(1)
          .single(),
        supabase
          .from('ai_services')
          .select('id, name, url, description, category, upvotes, thumbnail_gradient, thumbnail_url')
          .eq('status', 'approved')
          .order('upvotes', { ascending: false })
          .limit(5),
        supabase
          .from('ai_services')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
      ]);

      if (colRes.data) setCollection(colRes.data as unknown as CollectionWithServices);
      if (topRes.data) setTopServices(topRes.data as Service[]);
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
      setTopServices((prev) => prev.map((s) => s.id === serviceId ? { ...s, upvotes: s.upvotes + 1 } : s));
      if (collection) {
        setCollection((prev) => prev ? {
          ...prev,
          collection_services: prev.collection_services.map((cs) => ({
            ...cs,
            ai_services: cs.ai_services.map((s) => s.id === serviceId ? { ...s, upvotes: s.upvotes + 1 } : s),
          })),
        } : prev);
      }
    }
  };

  const collectionServices: Service[] = collection
    ? collection.collection_services
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((cs) => cs.ai_services)
        .filter((s): s is Service => Boolean(s))
    : [];

  const filtered = activeCategory === '전체'
    ? collectionServices
    : collectionServices.filter((s) => s.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 selection:bg-violet-500/10" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
      <Header />

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="relative py-14 sm:py-18 text-center px-6 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.08), transparent)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs font-semibold text-violet-700">✨ 일반인이 AI로 만든 서비스 모음</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight leading-[1.1] mb-4">
              평범한 아이디어가
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">진짜 서비스가 됩니다</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-500 mb-7 max-w-md mx-auto leading-relaxed">
              코딩 몰라도 괜찮아요. AI로 만든 창의적인 결과물을 발견해 보세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-violet-300/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                서비스 등록하기
              </Link>
              <Link
                href="/all"
                className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-zinc-200 hover:border-violet-300 hover:bg-violet-50/50 text-zinc-700 hover:text-violet-700 text-sm font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
              >
                전체 서비스 보기
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Split Layout ── */}
        <section className="max-w-[1200px] mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── LEFT: Curated Collection Grid (2/3) ── */}
            <div className="lg:col-span-2">
              {/* Section title + stats */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                    {loading ? (
                      <span className="inline-block w-48 h-6 bg-zinc-200 rounded-lg animate-pulse" />
                    ) : (
                      collection?.title ?? 'Sparks 추천 PICK ⚡'
                    )}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">총 {totalCount}개 서비스</p>
                </div>
                <Link href="/all" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors">
                  전체보기
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Category filter chips */}
              <div
                className="relative mb-6"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)', maskImage: 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)' }}
              >
                <div role="group" aria-label="카테고리 필터" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      aria-pressed={activeCategory === cat}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shrink-0 ${
                        activeCategory === cat
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200/50'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:border-violet-300 hover:text-violet-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-4 bg-white rounded-2xl p-4 border border-zinc-200 shadow-lg shadow-violet-100/40 animate-pulse">
                      <div className="w-20 h-20 rounded-xl bg-zinc-100 shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-zinc-100 rounded-full w-1/3" />
                        <div className="h-4 bg-zinc-100 rounded-lg w-4/5" />
                        <div className="h-3 bg-zinc-50 rounded-full w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && filtered.length === 0 && (
                <div className="py-20 text-center rounded-3xl bg-white border border-zinc-100">
                  <p className="text-3xl mb-3">🔮</p>
                  <p className="text-sm font-semibold text-zinc-700 mb-1">컬렉션 준비 중이에요</p>
                  <p className="text-xs text-zinc-400 mb-5">곧 엄선된 AI 서비스를 소개할게요.</p>
                  <Link href="/all" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline">
                    전체 서비스 둘러보기 →
                  </Link>
                </div>
              )}

              {/* Card grid — horizontal card layout (image left, text right) */}
              {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((service) => {
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
                        className="group flex gap-4 bg-white border border-zinc-200 rounded-2xl p-4 shadow-lg shadow-violet-100/40 hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className={`relative w-[88px] h-[88px] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${service.thumbnail_gradient}`}>
                          {service.thumbnail_url ? (
                            <Image
                              src={service.thumbnail_url}
                              alt={service.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="88px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white/30 text-3xl font-black select-none" aria-hidden="true">{service.name[0]}</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-1 ${CATEGORY_BADGE_STYLES[service.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                              {service.category}
                            </span>
                            <h3 className="text-[14px] font-bold text-zinc-950 leading-snug tracking-tight line-clamp-1">
                              {service.name}
                            </h3>
                            <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2 mt-0.5">
                              {service.description}
                            </p>
                          </div>

                          {/* Bottom row */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] font-semibold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                              방문하기
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleUpvote(e, service.id)}
                              disabled={isVoting}
                              aria-pressed={hasVoted}
                              aria-label={`추천 ${service.upvotes}개`}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 border disabled:opacity-60 ${
                                hasVoted
                                  ? 'bg-rose-600 border-rose-600 text-white cursor-default'
                                  : 'bg-rose-50/50 border-rose-100 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600'
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
                              {service.upvotes}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT: Ranking Sidebar (1/3) ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-3xl bg-white p-6 shadow-lg shadow-violet-100/40 border border-zinc-100">
                <h2 className="text-base font-bold text-zinc-950 mb-5 flex items-center gap-2">
                  🔥 <span>요즘 인기 서비스</span>
                </h2>

                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-6 h-6 rounded-lg bg-zinc-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-zinc-100 rounded-full w-3/4" />
                          <div className="h-2.5 bg-zinc-50 rounded-full w-1/2" />
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Ranking list */}
                {!loading && (
                  <ol className="space-y-1">
                    {topServices.map((service, index) => (
                      <li key={service.id}>
                        <button
                          type="button"
                          onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-violet-50/60 transition-colors duration-200 text-left group"
                          aria-label={`${index + 1}위 ${service.name} - 새 탭에서 열기`}
                        >
                          {/* Rank badge */}
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0 ${RANK_COLORS[index]}`}>
                            {index + 1}
                          </span>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-zinc-900 leading-snug truncate group-hover:text-violet-700 transition-colors">
                              {service.name}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              {service.upvotes}
                            </p>
                          </div>

                          {/* Mini thumbnail */}
                          <div className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br ${service.thumbnail_gradient}`}>
                            {service.thumbnail_url ? (
                              <Image
                                src={service.thumbnail_url}
                                alt={service.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white/40 text-sm font-black select-none" aria-hidden="true">{service.name[0]}</span>
                              </div>
                            )}
                          </div>
                        </button>

                        {index < topServices.length - 1 && (
                          <div className="mx-2.5 border-b border-zinc-50" />
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {/* CTA */}
                <Link
                  href="/all"
                  className="mt-5 flex items-center justify-center gap-1.5 w-full h-10 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 shadow-sm shadow-indigo-200/50"
                >
                  전체 서비스 보기
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

          </div>
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
