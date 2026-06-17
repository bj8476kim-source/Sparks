'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import ContactModal from '@/components/ContactModal';
import type { Service } from '@/types/database';

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  '재미': 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  '게임': 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  '창작': 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  '일상': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  '공부': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  '비즈니스': 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
};

const CATEGORIES = ['전체', '재미', '게임', '창작', '일상', '공부', '비즈니스'];

export default function AllServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [votedIds, setVotedIds] = useState<number[]>([]);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const showToast = useToast();

  async function fetchServices() {
    setLoading(true);
    setFetchError(false);
    const { data, error } = await supabase
      .from('ai_services')
      .select('id, name, url, description, category, upvotes, thumbnail_gradient, thumbnail_url')
      .eq('status', 'approved')
      .order('upvotes', { ascending: false });

    if (error) setFetchError(true);
    else if (data) setServices(data as Service[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
    const localVotes = localStorage.getItem('sparks_votes');
    if (localVotes) {
      try { setVotedIds(JSON.parse(localVotes)); } catch {}
    }
    const channel = supabase
      .channel('all_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_services' }, fetchServices)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => services.filter((s) => {
    const matchCat = activeCategory === '전체' || s.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchSearch = q
      ? s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      : true;
    return matchCat && matchSearch;
  }), [services, activeCategory, search]);

  const handleUpvote = async (e: React.MouseEvent | React.KeyboardEvent, serviceId: number) => {
    e.stopPropagation();
    if (votedIds.includes(serviceId) || votingId === serviceId) {
      if (votedIds.includes(serviceId)) showToast('이미 추천하신 서비스입니다.', 'info');
      return;
    }
    setVotingId(serviceId);
    const { error } = await supabase.rpc('increment_upvote', { service_id: serviceId });
    setVotingId(null);
    if (error) {
      showToast('추천에 실패했습니다. 다시 시도해주세요.', 'error');
    } else {
      const updated = [...votedIds, serviceId];
      setVotedIds(updated);
      localStorage.setItem('sparks_votes', JSON.stringify(updated));
      setServices((prev) => prev.map((s) => s.id === serviceId ? { ...s, upvotes: s.upvotes + 1 } : s));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 selection:bg-violet-500/10" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
      <Header />

      <main id="main-content">
        {/* Page Header */}
        <section className="relative py-12 sm:py-16 text-center px-6 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.07), transparent)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 mb-5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              메인으로
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight leading-[1.1] mb-3">
              전체 서비스 <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">모아보기</span>
            </h1>
            <p className="text-sm text-zinc-500 mb-8">
              일반인이 AI로 만든 서비스 <strong className="text-zinc-700 font-semibold">{services.length}개</strong>를 모두 탐색해 보세요.
            </p>

            {/* Search bar */}
            <div className="max-w-xl mx-auto relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                aria-label="AI 서비스 검색"
                placeholder="어떤 서비스를 찾고 있나요?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-full text-sm text-zinc-900 placeholder-zinc-400 shadow-md shadow-violet-100/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-300 transition-all duration-200"
              />
            </div>
          </div>
        </section>

        {/* Category Filter + Grid */}
        <section className="max-w-[1200px] mx-auto px-6 pb-24">
          <div
            className="relative mb-8"
            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)', maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)' }}
          >
            <div role="group" aria-label="카테고리 필터" className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shrink-0 ${
                    activeCategory === cat
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200/50'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {fetchError && (
            <div className="py-20 text-center">
              <p className="text-zinc-500 text-sm mb-4">데이터를 불러오지 못했습니다.</p>
              <button type="button" onClick={fetchServices} className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold transition-all duration-200">
                다시 시도
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !fetchError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-zinc-200 rounded-2xl shadow-lg shadow-violet-100/40 overflow-hidden animate-pulse">
                  <div className="h-44 bg-zinc-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-zinc-100 rounded-lg w-1/3" />
                    <div className="h-3.5 bg-zinc-50 rounded-full w-full" />
                    <div className="h-3.5 bg-zinc-50 rounded-full w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card grid */}
          {!loading && !fetchError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="group bg-white border border-zinc-200 rounded-2xl shadow-lg shadow-violet-100/40 hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden flex flex-col h-full"
                  >
                    <div className={`relative h-44 bg-gradient-to-br ${service.thumbnail_gradient} overflow-hidden shrink-0`}>
                      {service.thumbnail_url ? (
                        <Image src={service.thumbnail_url} alt={service.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white/20 text-7xl font-black select-none" aria-hidden="true">{service.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 ${CATEGORY_BADGE_STYLES[service.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                              {service.category}
                            </span>
                            <h3 className="text-[16px] font-bold text-zinc-950 leading-snug tracking-tight truncate">{service.name}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleUpvote(e, service.id)}
                            disabled={isVoting}
                            aria-pressed={hasVoted}
                            aria-label={`${service.name} 추천${hasVoted ? ' (이미 추천함)' : ''}, 현재 ${service.upvotes}개`}
                            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 border shadow-sm disabled:opacity-60 ${
                              hasVoted
                                ? 'bg-rose-600 border-rose-600 text-white cursor-default'
                                : 'bg-rose-50/50 border-rose-100/70 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                            }`}
                          >
                            {isVoting ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            )}
                            <span className="text-[11px] font-extrabold leading-none">{service.upvotes}</span>
                          </button>
                        </div>
                        <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2 mb-4">{service.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 mt-auto">
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
          )}

          {/* Empty state */}
          {!loading && !fetchError && filtered.length === 0 && (
            <div className="py-28 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
                </svg>
              </div>
              <p className="text-zinc-400 text-sm font-medium">
                {activeCategory === '전체' ? '등록된 AI 서비스가 없습니다.' : `'${activeCategory}' 카테고리에 등록된 서비스가 없습니다.`}
              </p>
              {activeCategory !== '전체' && (
                <button type="button" onClick={() => setActiveCategory('전체')} className="mt-3 text-xs font-semibold text-violet-600 hover:underline">
                  전체 서비스 보기
                </button>
              )}
            </div>
          )}
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
