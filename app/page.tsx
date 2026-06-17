'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
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

const TROPHY_EMOJI = ['🥇', '🥈', '🥉'];
const CARD_BORDER = ['border-amber-300/50', 'border-zinc-200', 'border-violet-300/50'];
const CARD_RING = ['ring-amber-200', 'ring-zinc-200', 'ring-violet-200'];

export default function Home() {
  const [collection, setCollection] = useState<CollectionWithServices | null>(null);
  const [topServices, setTopServices] = useState<Service[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);

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
  }, []);

  const collectionServices: Service[] = collection
    ? collection.collection_services
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((cs) => cs.ai_services)
        .filter((s): s is Service => Boolean(s))
    : [];

  const top3 = collectionServices.slice(0, 3);
  const rest4 = collectionServices.slice(3, 7);

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

            {/* ── LEFT: Leaderboard (2/3) ── */}
            <div className="lg:col-span-2">
              {/* Section header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                    {loading ? (
                      <span className="inline-block w-48 h-6 bg-zinc-200 rounded-lg animate-pulse" />
                    ) : (
                      collection?.title ?? 'flint 추천 PICK ⚡'
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

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-3xl bg-white border-2 border-zinc-100 p-6 animate-pulse space-y-4">
                        <div className="w-6 h-6 mx-auto rounded-full bg-zinc-100" />
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-100" />
                        <div className="h-3 bg-zinc-100 rounded-full w-2/3 mx-auto" />
                        <div className="h-2.5 bg-zinc-50 rounded-full w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-2xl bg-white border border-zinc-100 p-4 animate-pulse flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 shrink-0" />
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-zinc-100 rounded-full w-3/4" />
                          <div className="h-2.5 bg-zinc-50 rounded-full w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && collectionServices.length === 0 && (
                <div className="py-20 text-center rounded-3xl bg-white border border-zinc-100">
                  <Image
                    src="/main-character.png"
                    alt="플린트 캐릭터"
                    width={96}
                    height={94}
                    className="mx-auto mb-3 w-24 h-24 object-contain"
                  />
                  <p className="text-sm font-semibold text-zinc-700 mb-1">플린트가 킬러 AI 서비스를 열심히 큐레이션하고 있어요!</p>
                  <p className="text-xs text-zinc-400 mb-5">곧 엄선된 AI 서비스를 소개할게요.</p>
                  <Link href="/all" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline">
                    전체 서비스 둘러보기 →
                  </Link>
                </div>
              )}

              {/* Leaderboard */}
              {!loading && collectionServices.length > 0 && (
                <div className="space-y-5">

                  {/* ── TOP 1–3: Premium Trophy Cards ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {top3.map((service, i) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
                        aria-label={`${i + 1}위 ${service.name} - 새 탭에서 열기`}
                        className={`group w-full text-left rounded-3xl bg-white p-6 shadow-lg shadow-violet-100/40 border-2 ${CARD_BORDER[i]} hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-1.5 transition-all duration-300 ease-in-out`}
                      >
                        <div className="flex flex-col items-center mb-4">
                          <span className="text-xl mb-2.5" aria-hidden="true">{TROPHY_EMOJI[i]}</span>
                          <div className={`w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br ${service.thumbnail_gradient} flex items-center justify-center ring-2 ring-offset-2 ${CARD_RING[i]}`}>
                            {service.thumbnail_url ? (
                              <Image
                                src={service.thumbnail_url}
                                alt={service.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white/50 text-2xl font-black select-none" aria-hidden="true">{service.name[0]}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-1.5 ${CATEGORY_BADGE_STYLES[service.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {service.category}
                          </span>
                          <h3 className="text-[14px] font-bold text-zinc-950 leading-snug tracking-tight line-clamp-1 group-hover:text-violet-700 transition-colors">
                            {service.name}
                          </h3>
                          <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2 mt-1">
                            {service.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* ── BOTTOM 4–7: Flat 2-col List ── */}
                  {rest4.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {rest4.map((service, i) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
                          aria-label={`${i + 4}위 ${service.name} - 새 탭에서 열기`}
                          className="group w-full text-left flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-zinc-100 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 hover:-translate-y-0.5 transition-all duration-200 ease-in-out"
                        >
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-extrabold text-zinc-500">#{i + 4}</span>
                          </div>
                          <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br ${service.thumbnail_gradient} flex items-center justify-center`}>
                            {service.thumbnail_url ? (
                              <Image
                                src={service.thumbnail_url}
                                alt={service.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white/40 text-sm font-black select-none" aria-hidden="true">{service.name[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-zinc-900 leading-snug truncate group-hover:text-violet-700 transition-colors">
                              {service.name}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{service.description}</p>
                          </div>
                          <svg className="w-3.5 h-3.5 text-zinc-300 group-hover:text-violet-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* ── RIGHT: Ranking Sidebar (1/3) ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-3xl bg-white p-6 shadow-lg shadow-violet-100/40 border border-zinc-100">
                <h2 className="text-base font-bold text-zinc-950 mb-5 flex items-center gap-2">
                  🔥 <span>요즘 인기 서비스</span>
                </h2>

                {loading && (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                        <div className="w-6 h-6 rounded-lg bg-zinc-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-zinc-100 rounded-full w-3/4" />
                          <div className="h-2.5 bg-zinc-50 rounded-full w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && (
                  <ol className="space-y-0.5">
                    {topServices.map((service, index) => (
                      <li key={service.id}>
                        <button
                          type="button"
                          onClick={() => window.open(service.url, '_blank', 'noopener,noreferrer')}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-all duration-200 ease-in-out text-left group"
                          aria-label={`${index + 1}위 ${service.name} - 새 탭에서 열기`}
                        >
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0 ${RANK_COLORS[index]}`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-900 leading-snug truncate group-hover:text-violet-700 transition-colors">
                              {service.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5 leading-relaxed">
                              {service.description}
                            </p>
                          </div>
                        </button>
                        {index < topServices.length - 1 && (
                          <div className="mx-3 border-b border-zinc-50" />
                        )}
                      </li>
                    ))}
                  </ol>
                )}

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
              flint는 유용한 AI 서비스를 소개하는 큐레이션 플랫폼입니다. 등록된 콘텐츠의 저작권은 원저작자에게 있으며,{' '}
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
            <span className="text-base leading-none" aria-hidden="true">🔮</span>
            <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>flint</span>
          </div>
          <p className="text-xs text-zinc-400">© 2026 flint. All rights reserved.</p>
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
