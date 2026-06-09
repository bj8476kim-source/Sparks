'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

const CATEGORIES = ['재미', '게임', '창작', '일상', '공부', '비즈니스'] as const;
type Category = (typeof CATEGORIES)[number] | '';

const DEFAULT_GRADIENTS: Record<string, string> = {
  재미: 'from-orange-900 via-orange-800 to-orange-950',
  게임: 'from-violet-900 via-purple-800 to-violet-950',
  창작: 'from-blue-900 via-blue-800 to-blue-950',
  일상: 'from-emerald-900 via-emerald-800 to-emerald-950',
  공부: 'from-amber-900 via-amber-800 to-amber-950',
  비즈니스: 'from-rose-900 via-rose-800 to-rose-950',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface FormData {
  name: string;
  url: string;
  description: string;
  category: Category;
}

interface FormErrors {
  name?: string;
  url?: string;
  description?: string;
  category?: string;
  thumbnail?: string;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

export default function SubmitPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitErrorRef = useRef<HTMLParagraphElement>(null);

  const [form, setForm] = useState<FormData>({ name: '', url: '', description: '', category: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitError && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitError]);

  const applyFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, thumbnail: '파일 크기는 5MB 이하여야 합니다.' }));
      return;
    }
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, thumbnail: undefined }));
  };

  const clearFile = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    const name = stripTags(form.name.trim());
    if (!name) errs.name = '서비스 이름을 입력해주세요.';
    else if (name.length > 100) errs.name = '서비스 이름은 100자 이내로 입력해주세요.';

    const url = form.url.trim();
    if (!url) errs.url = '웹사이트 URL을 입력해주세요.';
    else if (!isValidUrl(url)) errs.url = '유효한 URL을 입력해주세요. (예: https://example.com)';

    const description = stripTags(form.description.trim());
    if (!description) errs.description = '한 줄 설명을 입력해주세요.';
    else if (description.length > 200) errs.description = '한 줄 설명은 200자 이내로 입력해주세요.';

    if (!form.category) errs.category = '카테고리를 선택해주세요.';

    return errs;
  };

  const uploadThumbnail = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let thumbnail_url: string | null = null;
    if (thumbnailFile) {
      thumbnail_url = await uploadThumbnail(thumbnailFile);
      if (!thumbnail_url) {
        setSubmitError('이미지 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from('ai_services').insert({
      name: stripTags(form.name.trim()),
      url: form.url.trim(),
      description: stripTags(form.description.trim()),
      category: form.category,
      status: 'pending',
      upvotes: 0,
      thumbnail_gradient: DEFAULT_GRADIENTS[form.category] ?? 'from-slate-800 via-slate-700 to-slate-900',
      thumbnail_url,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError('등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    clearFile();
    setSubmitted(true);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  const inputClass = (hasError?: string) =>
    `w-full h-10 px-3 rounded-lg border text-sm text-zinc-900 placeholder-zinc-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      hasError ? 'border-red-400' : 'border-zinc-200'
    }`;

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <main id="main-content" className="py-16 px-6">
          <div className="max-w-[560px] mx-auto">
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mb-2">등록 요청 완료!</h1>
              <p className="text-sm text-zinc-500 leading-relaxed mb-2">
                직접 만든 서비스를 공유해 주셔서 감사합니다.
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                검토까지 보통 <strong className="text-zinc-600">24시간</strong> 이내 소요됩니다.
                승인 후 Sparks에 자동으로 소개됩니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center"
                >
                  Sparks 둘러보기
                </Link>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setForm({ name: '', url: '', description: '', category: '' }); setErrors({}); }}
                  className="h-10 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  다른 서비스 등록하기
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <main id="main-content" className="py-16 px-6">
        <div className="max-w-[560px] mx-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8 sm:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mb-2">
                내가 만든 AI 서비스 등록하기
              </h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                AI로 직접 만든 서비스를 Sparks에 올려보세요. 검토 후 모두에게 소개됩니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="AI 서비스 등록 양식">
              {/* 서비스 이름 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="service-name" className="text-sm font-medium text-zinc-700">
                    서비스 이름 <span className="text-red-500" aria-hidden="true">*</span>
                    <span className="sr-only">(필수)</span>
                  </label>
                  <span className={`text-xs ${form.name.length > 90 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {form.name.length} / 100
                  </span>
                </div>
                <input
                  id="service-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="예: AI Finder Pro"
                  maxLength={100}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={inputClass(errors.name)}
                />
                {errors.name && <p id="name-error" role="alert" className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* 웹사이트 URL */}
              <div>
                <label htmlFor="service-url" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  웹사이트 URL <span className="text-red-500" aria-hidden="true">*</span>
                  <span className="sr-only">(필수)</span>
                </label>
                <input
                  id="service-url"
                  type="url"
                  value={form.url}
                  onChange={(e) => handleChange('url', e.target.value)}
                  placeholder="https://example.com"
                  maxLength={500}
                  aria-invalid={!!errors.url}
                  aria-describedby={errors.url ? 'url-error' : undefined}
                  className={inputClass(errors.url)}
                />
                {errors.url && <p id="url-error" role="alert" className="mt-1 text-xs text-red-500">{errors.url}</p>}
              </div>

              {/* 한 줄 설명 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="service-description" className="text-sm font-medium text-zinc-700">
                    한 줄 설명 <span className="text-red-500" aria-hidden="true">*</span>
                    <span className="sr-only">(필수)</span>
                  </label>
                  <span className={`text-xs ${form.description.length > 180 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {form.description.length} / 200
                  </span>
                </div>
                <input
                  id="service-description"
                  type="text"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="가장 핵심적인 가치를 설명해주세요."
                  maxLength={200}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                  className={inputClass(errors.description)}
                />
                {errors.description && (
                  <p id="description-error" role="alert" className="mt-1 text-xs text-red-500">{errors.description}</p>
                )}
              </div>

              {/* 카테고리 */}
              <div>
                <label htmlFor="service-category" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  카테고리 <span className="text-red-500" aria-hidden="true">*</span>
                  <span className="sr-only">(필수)</span>
                </label>
                <div className="relative">
                  <select
                    id="service-category"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    aria-invalid={!!errors.category}
                    aria-describedby={errors.category ? 'category-error' : undefined}
                    className={`w-full h-10 pl-3 pr-9 rounded-lg border text-sm bg-white appearance-none transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      form.category ? 'text-zinc-900' : 'text-zinc-400'
                    } ${errors.category ? 'border-red-400' : 'border-zinc-200'}`}
                  >
                    <option value="" disabled>카테고리를 선택하세요</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {errors.category && (
                  <p id="category-error" role="alert" className="mt-1 text-xs text-red-500">{errors.category}</p>
                )}
              </div>

              {/* 썸네일 이미지 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5" id="thumbnail-label">
                  썸네일 이미지{' '}
                  <span className="text-zinc-400 font-normal">(선택)</span>
                </label>
                <div
                  role="button"
                  tabIndex={thumbnailFile ? -1 : 0}
                  aria-labelledby="thumbnail-label"
                  aria-describedby={errors.thumbnail ? 'thumbnail-error' : 'thumbnail-hint'}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => !thumbnailFile && fileInputRef.current?.click()}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !thumbnailFile) { e.preventDefault(); fileInputRef.current?.click(); } }}
                  className={`relative flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed overflow-hidden transition-colors ${
                    thumbnailFile
                      ? 'border-zinc-200 bg-white cursor-default'
                      : isDragging
                        ? 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 cursor-pointer'
                  }`}
                >
                  {thumbnailPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnailPreview}
                        alt="업로드된 썸네일 미리보기"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                      />
                      <div className="relative z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-medium text-zinc-700 truncate max-w-[180px]">{thumbnailFile?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          className="flex-shrink-0 text-zinc-400 hover:text-red-500 transition-colors"
                          aria-label="파일 제거"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8" />
                      </svg>
                      <p className="text-sm text-zinc-500">이미지를 드래그하거나 클릭하여 업로드</p>
                      <p id="thumbnail-hint" className="text-xs text-zinc-400">PNG, JPG · 최대 5MB · 추천 1200×630px</p>
                    </>
                  )}
                </div>
                {errors.thumbnail && (
                  <p id="thumbnail-error" role="alert" className="mt-1 text-xs text-red-500">{errors.thumbnail}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>

              {/* 서버 에러 */}
              {submitError && (
                <p ref={submitErrorRef} role="alert" className="text-sm text-red-500 text-center">
                  {submitError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? '처리 중...' : '검토 요청하기'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold text-zinc-950">Sparks</span>
          <p className="text-xs text-zinc-400">© 2026 Sparks. All rights reserved.</p>
          <nav aria-label="푸터 링크" className="flex items-center gap-5">
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Terms of Service</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
