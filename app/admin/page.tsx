'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';
import ContactDetailModal from '@/components/ContactDetailModal';

type Status = 'pending' | 'approved' | 'hidden';
type FilterTab = '전체' | '대기중' | '승인됨' | '숨김';
type ContactStatus = '접수' | '처리완료';
type AdminSection = 'services' | 'contacts' | 'collections';

interface ContactRow {
  id: number;
  created_at: string;
  email: string;
  type: '삭제요청' | '일반문의';
  target_service: string | null;
  message: string;
  status: ContactStatus;
}

interface DbRow {
  id: number;
  name: string;
  url: string;
  description: string;
  category: string;
  status: Status;
  upvotes: number;
  thumbnail_gradient: string;
  thumbnail_url: string | null;
  created_at: string;
}

interface ConfirmState {
  row: DbRow;
  action: 'delete';
}

interface CollectionRow {
  id: string;
  title: string;
  priority: number;
  created_at: string;
}

interface CollectionForm {
  title: string;
  priority: number;
}

interface EditForm {
  name: string;
  url: string;
  description: string;
  category: string;
  status: Status;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: '대기 중',
  approved: '승인됨',
  hidden: '거절/숨김',
};

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  hidden: 'bg-zinc-100 text-zinc-500',
};

const CATEGORY_BADGE: Record<string, string> = {
  '재미': 'bg-orange-50 text-orange-600 border border-orange-100',
  '게임': 'bg-violet-50 text-violet-600 border border-violet-100',
  '창작': 'bg-blue-50 text-blue-600 border border-blue-100',
  '일상': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  '공부': 'bg-amber-50 text-amber-600 border border-amber-100',
  '비즈니스': 'bg-rose-50 text-rose-600 border border-rose-100',
};

const ADMIN_CATEGORIES = ['재미', '게임', '창작', '일상', '공부', '비즈니스'] as const;

const CATEGORY_GRADIENTS: Record<string, string> = {
  재미: 'from-orange-900 via-orange-800 to-orange-950',
  게임: 'from-violet-900 via-purple-800 to-violet-950',
  창작: 'from-blue-900 via-blue-800 to-blue-950',
  일상: 'from-emerald-900 via-emerald-800 to-emerald-950',
  공부: 'from-amber-900 via-amber-800 to-amber-950',
  비즈니스: 'from-rose-900 via-rose-800 to-rose-950',
};

const FILTER_TABS: FilterTab[] = ['전체', '대기중', '승인됨', '숨김'];
const STATUS_BY_TAB: Record<FilterTab, Status | null> = { '전체': null, '대기중': 'pending', '승인됨': 'approved', '숨김': 'hidden' };

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [rows, setRows] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('대기중');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [editRow, setEditRow] = useState<DbRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [activeSection, setActiveSection] = useState<AdminSection>('services');
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactActionLoading, setContactActionLoading] = useState<number | null>(null);
  const [contactDetail, setContactDetail] = useState<ContactRow | null>(null);

  // Collections state
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionForm, setCollectionForm] = useState<CollectionForm | null>(null);
  const [editingCollection, setEditingCollection] = useState<CollectionRow | null>(null);
  const [pickerCollection, setPickerCollection] = useState<CollectionRow | null>(null);
  const [pickerServices, setPickerServices] = useState<number[]>([]);
  const [allApprovedServices, setAllApprovedServices] = useState<DbRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSaving, setPickerSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function showToast(message: string, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchAll();
        fetchContacts();
      } else {
        setIsAdmin((prev) => prev === true ? true : false);
      }
    }
    checkUser();

    const servicesChannel = supabase
      .channel('admin_services_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_services' }, () => {
        setIsAdmin((current) => {
          if (current) fetchAll();
          return current;
        });
      })
      .subscribe();

    const contactsChannel = supabase
      .channel('admin_contacts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contacts' }, (payload) => {
        // fetchContacts() 재조회 대신 payload.new를 직접 prepend → 자동완료 경쟁조건 원천 차단
        setIsAdmin((current) => {
          if (current) setContacts((prev) => [payload.new as ContactRow, ...prev]);
          return current;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(contactsChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      showToast('이메일 또는 비밀번호가 올바르지 않습니다.', false);
    } else {
      setIsAdmin(true);
      fetchAll();
      fetchContacts();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRows([]);
  }

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_services')
      .select('id, name, url, description, category, status, upvotes, thumbnail_gradient, thumbnail_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('데이터 로딩 실패: ' + error.message, false);
    } else if (data) {
      setRows(data as DbRow[]);
    }
    setLoading(false);
  }

  async function fetchContacts() {
    setContactsLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('id, created_at, email, type, target_service, message, status')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('문의 내역 로딩 실패: ' + error.message, false);
    } else if (data) {
      setContacts(data as ContactRow[]);
    }
    setContactsLoading(false);
  }

  async function fetchCollections() {
    setCollectionsLoading(true);
    const { data, error } = await supabase
      .from('collections')
      .select('id, title, priority, created_at')
      .order('priority', { ascending: true });
    if (error) showToast('컬렉션 로딩 실패: ' + error.message, false);
    else if (data) setCollections(data as CollectionRow[]);
    setCollectionsLoading(false);
  }

  async function handleCollectionSave() {
    if (!collectionForm) return;
    const title = collectionForm.title.trim();
    if (!title) { showToast('테마명을 입력하세요.', false); return; }

    if (editingCollection) {
      const { error } = await supabase.from('collections').update({ title, priority: collectionForm.priority }).eq('id', editingCollection.id);
      if (error) { showToast('수정 실패: ' + error.message, false); return; }
      setCollections((prev) => prev.map((c) => c.id === editingCollection.id ? { ...c, title, priority: collectionForm.priority } : c).sort((a, b) => a.priority - b.priority));
      showToast(`"${title}" 테마 수정 완료`);
    } else {
      const { data, error } = await supabase.from('collections').insert({ title, priority: collectionForm.priority }).select();
      if (error) { showToast('추가 실패: ' + error.message, false); return; }
      if (data) setCollections((prev) => [...prev, data[0] as CollectionRow].sort((a, b) => a.priority - b.priority));
      showToast(`"${title}" 테마 추가 완료`);
    }
    setCollectionForm(null);
    setEditingCollection(null);
  }

  async function handleCollectionDelete(col: CollectionRow) {
    if (!window.confirm(`"${col.title}" 테마를 삭제하시겠습니까? 연결된 서비스 픽도 함께 삭제됩니다.`)) return;
    const { error } = await supabase.from('collections').delete().eq('id', col.id);
    if (error) { showToast('삭제 실패: ' + error.message, false); return; }
    setCollections((prev) => prev.filter((c) => c.id !== col.id));
    showToast(`"${col.title}" 테마 삭제 완료`);
  }

  async function openServicePicker(col: CollectionRow) {
    setPickerCollection(col);
    setPickerLoading(true);
    setPickerSearch('');
    const [svcRes, pickRes] = await Promise.all([
      supabase.from('ai_services').select('id, name, url, description, category, status, upvotes, thumbnail_gradient, thumbnail_url, created_at').eq('status', 'approved').order('upvotes', { ascending: false }),
      supabase.from('collection_services').select('service_id').eq('collection_id', col.id),
    ]);
    if (svcRes.data) setAllApprovedServices(svcRes.data as DbRow[]);
    if (pickRes.data) setPickerServices(pickRes.data.map((r: { service_id: number }) => r.service_id));
    setPickerLoading(false);
  }

  async function handlePickerSave() {
    if (!pickerCollection) return;
    setPickerSaving(true);
    const { data: current } = await supabase.from('collection_services').select('service_id').eq('collection_id', pickerCollection.id);
    const currentIds = (current ?? []).map((r: { service_id: number }) => r.service_id);
    const toAdd = pickerServices.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id: number) => !pickerServices.includes(id));
    if (toAdd.length > 0) await supabase.from('collection_services').insert(toAdd.map((id, i) => ({ collection_id: pickerCollection.id, service_id: id, sort_order: currentIds.length + i })));
    if (toRemove.length > 0) await supabase.from('collection_services').delete().eq('collection_id', pickerCollection.id).in('service_id', toRemove);
    setPickerSaving(false);
    showToast(`"${pickerCollection.title}" 서비스 픽 저장 완료`);
    setPickerCollection(null);
    setPickerServices([]);
  }

  async function handleContactDelete(contact: ContactRow) {
    if (!window.confirm('정말 이 문의를 영구 삭제하시겠습니까?')) return;
    setContactActionLoading(contact.id);
    const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
    setContactActionLoading(null);
    if (error) { showToast('삭제 실패: ' + error.message, false); return; }
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    showToast('문의가 삭제되었습니다.');
  }

  async function handleContactDone(contact: ContactRow) {
    setContactActionLoading(contact.id);
    const { error } = await supabase
      .from('contacts')
      .update({ status: '처리완료' })
      .eq('id', contact.id);
    setContactActionLoading(null);

    if (error) {
      showToast('처리 실패: ' + error.message, false);
      return;
    }
    setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, status: '처리완료' as ContactStatus } : c));
    showToast(`"${contact.email}" 문의 처리 완료`);
  }

  const filtered = useMemo(() => {
    const statusFilter = STATUS_BY_TAB[activeTab];
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchStatus = statusFilter ? r.status === statusFilter : true;
      const matchSearch = q
        ? r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
        : true;
      return matchStatus && matchSearch;
    });
  }, [rows, activeTab, search]);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const hiddenCount = rows.filter((r) => r.status === 'hidden').length;
  const approvedTodayCount = rows.filter((r) => r.status === 'approved' && r.created_at.startsWith(today)).length;

  const urlCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.url] = (counts[r.url] ?? 0) + 1; });
    return counts;
  }, [rows]);

  async function handleApprove(row: DbRow) {
    setActionLoading(row.id);
    const { error } = await supabase.from('ai_services').update({ status: 'approved' }).eq('id', row.id);
    setActionLoading(null);
    if (error) { showToast('승인 실패: ' + error.message, false); return; }
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'approved' } : r));
    showToast(`"${row.name}" 승인 완료`);
  }

  async function handleReject(row: DbRow) {
    setActionLoading(row.id);
    const { error } = await supabase.from('ai_services').update({ status: 'hidden' }).eq('id', row.id);
    setActionLoading(null);
    if (error) { showToast('거절 실패: ' + error.message, false); return; }
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'hidden' } : r));
    showToast(`"${row.name}" 거절 처리됨`);
  }

  function openEdit(row: DbRow) {
    setEditRow(row);
    setEditForm({ name: row.name, url: row.url, description: row.description, category: row.category, status: row.status });
  }

  function closeEdit() {
    setEditRow(null);
    setEditForm(null);
  }

  async function handleEditSave() {
    if (!editRow || !editForm) return;
    const trimmed = { name: editForm.name.trim(), url: editForm.url.trim(), description: editForm.description.trim() };
    if (!trimmed.name || !trimmed.url || !trimmed.description) {
      showToast('이름, URL, 설명은 필수 항목입니다.', false);
      return;
    }
    const rowId = editRow.id;
    setActionLoading(rowId);
    const newGradient = CATEGORY_GRADIENTS[editForm.category] ?? editRow.thumbnail_gradient;
    const { data: updated, error } = await supabase
      .from('ai_services')
      .update({ ...trimmed, category: editForm.category, status: editForm.status, thumbnail_gradient: newGradient })
      .eq('id', rowId)
      .select();
    setActionLoading(null);
    if (error) { showToast('수정 실패: ' + error.message, false); return; }
    if (!updated || updated.length === 0) { showToast('수정 실패: 권한이 없거나 항목을 찾을 수 없습니다.', false); return; }
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, ...(updated[0] as DbRow) } : r));
    showToast(`"${trimmed.name}" 수정 완료`);
    closeEdit();
  }

  async function executeDelete(row: DbRow) {
    setConfirmState(null);
    setActionLoading(row.id);
    const { error } = await supabase.from('ai_services').delete().eq('id', row.id);
    setActionLoading(null);
    if (error) { showToast('삭제 실패: ' + error.message, false); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    showToast(`"${row.name}" 삭제 완료`);
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-sm text-zinc-400">
        보안 검사 중...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 selection:bg-blue-500/10">
        {toast && (
          <div
            role="alert"
            aria-live="polite"
            className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-toast-in ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {toast.message}
          </div>
        )}
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600 shadow-sm shadow-blue-500/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-950 tracking-tight mb-1">관리자 인증</h1>
            <p className="text-xs text-zinc-400 font-medium">허가되지 않은 접근은 엄격히 차단됩니다.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-zinc-500 mb-1.5 pl-0.5">이메일 주소</label>
              <input
                id="admin-email"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@example.com"
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-zinc-500 mb-1.5 pl-0.5">비밀번호</label>
              <input
                id="admin-password"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 mt-6">
              자물쇠 해제하기
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 transition-colors">← 메인 화면으로</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-toast-in ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {toast.message}
        </div>
      )}

      {/* Edit Modal */}
      {editRow && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-950">서비스 수정</h2>
              <button
                onClick={closeEdit}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                aria-label="닫기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">서비스 이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)}
                  maxLength={100}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">URL</label>
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm((f) => f ? { ...f, url: e.target.value } : f)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">한줄 설명</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)}
                  maxLength={200}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">카테고리</label>
                  <div className="relative">
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm((f) => f ? { ...f, category: e.target.value } : f)}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      {ADMIN_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">상태</label>
                  <div className="relative">
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => f ? { ...f, status: e.target.value as Status } : f)}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="pending">대기 중</option>
                      <option value="approved">승인됨</option>
                      <option value="hidden">거절/숨김</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleEditSave}
                disabled={actionLoading === editRow.id}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading === editRow.id ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={closeEdit}
                className="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          title="서비스 삭제"
          message={`"${confirmState.row.name}"을(를) 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          cancelLabel="취소"
          variant="danger"
          onConfirm={() => executeDelete(confirmState.row)}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-zinc-950 tracking-tight">flint</Link>
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-md">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="h-9 px-3.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-sm font-semibold rounded-xl transition-colors"
            >
              로그아웃
            </button>
            <Link href="/" className="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5">
              메인으로
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mb-1">관리자 대시보드</h1>
            <p className="text-sm text-zinc-500">새로 제출된 AI 서비스들을 검토하고 승인 여부를 결정하세요.</p>
          </div>
        </div>

        {/* 섹션 탭 */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 w-fit mb-8">
          {([
            { key: 'services', label: '서비스 관리', count: rows.filter((r) => r.status === 'pending').length },
            { key: 'contacts', label: '문의 내역', count: contacts.filter((c) => c.status === '접수').length },
            { key: 'collections', label: '🎯 테마 관리', count: 0 },
          ] as { key: AdminSection; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setActiveSection(key); if (key === 'collections' && collections.length === 0) fetchCollections(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSection === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeSection === key ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-500'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeSection === 'services' && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: '승인 대기', value: pendingCount, color: 'bg-amber-50', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', iconColor: 'text-amber-500' },
            { label: '오늘 승인', value: approvedTodayCount, color: 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-emerald-500' },
            { label: '총 승인됨', value: approvedCount, color: 'bg-blue-50', icon: 'M5 13l4 4L19 7', iconColor: 'text-blue-500' },
            { label: '전체 등록', value: rows.length, color: 'bg-zinc-100', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', iconColor: 'text-zinc-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-950">{loading ? '—' : stat.value}</p>
              </div>
              <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center shrink-0`} aria-hidden="true">
                <svg className={`w-5 h-5 ${stat.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={stat.icon} />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div role="tablist" aria-label="상태 필터" className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
            {FILTER_TABS.map((tab) => {
              const count = tab === '전체' ? rows.length : tab === '대기중' ? pendingCount : tab === '승인됨' ? approvedCount : hiddenCount;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  {tab}
                  {!loading && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-200 text-zinc-500'} ${tab === '대기중' && pendingCount > 0 ? '!bg-amber-100 !text-amber-700' : ''}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-60 shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              aria-label="서비스명 또는 URL 검색"
              placeholder="서비스명 또는 URL 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70">
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-6 py-3 whitespace-nowrap">서비스명</th>
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 hidden sm:table-cell">URL</th>
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 hidden lg:table-cell">한줄 설명</th>
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 hidden sm:table-cell whitespace-nowrap">등록일</th>
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 whitespace-nowrap">카테고리</th>
                  <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 whitespace-nowrap">상태</th>
                  <th scope="col" className="text-right text-xs font-semibold text-zinc-500 px-6 py-3 whitespace-nowrap">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-zinc-200 shrink-0" /><div className="h-4 bg-zinc-200 rounded w-28" /></div></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-zinc-100 rounded w-36" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-100 rounded w-40" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-zinc-100 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-100 rounded-full w-14" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-zinc-100 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-7 bg-zinc-100 rounded w-36 ml-auto" /></td>
                  </tr>
                ))}

                {!loading && filtered.map((row) => {
                  const isDuplicate = (urlCounts[row.url] ?? 0) > 1;
                  const isActing = actionLoading === row.id;

                  return (
                    <tr key={row.id} className={`hover:bg-zinc-50/60 transition-colors ${row.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${row.thumbnail_gradient} flex items-center justify-center shrink-0`} aria-hidden="true">
                            <span className="text-white/30 text-lg font-black leading-none select-none">{row.name[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[140px]">{row.name}</p>
                            {isDuplicate && <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-500 mt-0.5">중복 의심</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block max-w-[180px] truncate">
                          {row.url.replace(/^https?:\/\//, '')}
                        </a>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-zinc-500 text-sm max-w-[240px] truncate">{row.description}</p>
                      </td>
                      <td className="px-4 py-4 text-zinc-500 text-sm whitespace-nowrap hidden sm:table-cell">
                        {row.created_at.split('T')[0].replace(/-/g, '.')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_BADGE[row.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[row.status]}`}>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(row)}
                            disabled={row.status === 'approved' || isActing}
                            aria-label={`${row.name} 승인`}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(row)}
                            disabled={row.status === 'hidden' || isActing}
                            aria-label={`${row.name} 거절`}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            거절
                          </button>
                          <button
                            onClick={() => openEdit(row)}
                            disabled={isActing}
                            aria-label={`${row.name} 수정`}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            편집
                          </button>
                          <button
                            onClick={() => setConfirmState({ row, action: 'delete' })}
                            disabled={isActing}
                            aria-label={`${row.name} 삭제`}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <p className="text-sm text-zinc-400">
                        {search ? '검색 결과가 없습니다.' : activeTab === '대기중' ? '승인 대기 중인 서비스가 없습니다.' : '표시할 서비스가 없습니다.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>)}

        {/* 테마 관리 섹션 */}
        {activeSection === 'collections' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-950 tracking-tight">테마 컬렉션 관리</h2>
                <p className="text-sm text-zinc-500 mt-0.5">메인 화면 좌측에 노출되는 큐레이션 테마를 설정합니다.</p>
              </div>
              <button
                onClick={() => { setEditingCollection(null); setCollectionForm({ title: '', priority: (collections.length + 1) }); }}
                className="h-9 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-200/50"
              >
                + 새 테마 추가
              </button>
            </div>

            {collectionsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-white border border-zinc-200 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!collectionsLoading && collections.length === 0 && (
              <div className="py-20 text-center bg-white border border-zinc-200 rounded-xl">
                <p className="text-3xl mb-3">🎯</p>
                <p className="text-sm font-semibold text-zinc-700 mb-1">등록된 테마가 없습니다</p>
                <p className="text-xs text-zinc-400 mb-4">먼저 Supabase에서 collections.sql을 실행하고 테마를 추가하세요.</p>
              </div>
            )}

            {!collectionsLoading && collections.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70">
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-6 py-3">테마명</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 w-24">우선순위</th>
                      <th scope="col" className="text-right text-xs font-semibold text-zinc-500 px-6 py-3">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {collections.map((col) => (
                      <tr key={col.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-900">{col.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{col.created_at.split('T')[0].replace(/-/g, '.')}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">P{col.priority}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openServicePicker(col)}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                            >
                              서비스 픽 ✏️
                            </button>
                            <button
                              onClick={() => { setEditingCollection(col); setCollectionForm({ title: col.title, priority: col.priority }); }}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleCollectionDelete(col)}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 문의 내역 섹션 */}
        {activeSection === 'contacts' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-950 tracking-tight">문의 및 삭제 요청 내역</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {contactsLoading ? '로딩 중...' : `총 ${contacts.length}건 · 미처리 ${contacts.filter((c) => c.status === '접수').length}건`}
                </p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70">
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-6 py-3 whitespace-nowrap">이메일</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 whitespace-nowrap">유형</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 hidden sm:table-cell whitespace-nowrap">대상 서비스</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 hidden lg:table-cell">내용</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 whitespace-nowrap hidden sm:table-cell">접수일</th>
                      <th scope="col" className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 whitespace-nowrap">상태</th>
                      <th scope="col" className="text-right text-xs font-semibold text-zinc-500 px-6 py-3 whitespace-nowrap">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {contactsLoading && Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-zinc-100 rounded w-36" /></td>
                        <td className="px-4 py-4"><div className="h-5 bg-zinc-100 rounded-full w-16" /></td>
                        <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-zinc-100 rounded w-28" /></td>
                        <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-zinc-100 rounded w-48" /></td>
                        <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-zinc-100 rounded w-20" /></td>
                        <td className="px-4 py-4"><div className="h-5 bg-zinc-100 rounded-full w-14" /></td>
                        <td className="px-6 py-4"><div className="h-7 bg-zinc-100 rounded w-20 ml-auto" /></td>
                      </tr>
                    ))}

                    {!contactsLoading && contacts.map((contact) => {
                      const isDone = contact.status === '처리완료';
                      const isActing = contactActionLoading === contact.id;

                      return (
                        <tr
                          key={contact.id}
                          onClick={() => setContactDetail(contact)}
                          className={`hover:bg-zinc-50/60 transition-colors cursor-pointer ${!isDone ? 'bg-rose-50/20' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-zinc-800 truncate max-w-[180px]">{contact.email}</p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${contact.type === '삭제요청' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              {contact.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <p className="text-zinc-500 text-sm max-w-[160px] truncate">{contact.target_service ?? '—'}</p>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <p className="text-zinc-500 text-sm max-w-[280px] truncate">{contact.message}</p>
                          </td>
                          <td className="px-4 py-4 text-zinc-500 text-sm whitespace-nowrap hidden sm:table-cell">
                            {contact.created_at.split('T')[0].replace(/-/g, '.')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {contact.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleContactDone(contact); }}
                                disabled={isDone || isActing}
                                aria-label={`${contact.email} 문의 처리 완료`}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isActing ? '처리 중...' : isDone ? '완료됨' : '처리 완료'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleContactDelete(contact); }}
                                disabled={isActing}
                                aria-label={`${contact.email} 문의 삭제`}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!contactsLoading && contacts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-20 text-center">
                          <p className="text-sm text-zinc-400">접수된 문의가 없습니다.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {contactDetail && (
        <ContactDetailModal
          contact={contactDetail}
          onClose={() => setContactDetail(null)}
        />
      )}

      {/* Collection Form Modal */}
      {collectionForm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setCollectionForm(null); setEditingCollection(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-950 mb-5">{editingCollection ? '테마 수정' : '새 테마 추가'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">테마명</label>
                <input
                  type="text"
                  value={collectionForm.title}
                  onChange={(e) => setCollectionForm((f) => f ? { ...f, title: e.target.value } : f)}
                  placeholder="예: flint 추천 PICK ⚡"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">우선순위 (낮을수록 먼저 표시)</label>
                <input
                  type="number"
                  value={collectionForm.priority}
                  onChange={(e) => setCollectionForm((f) => f ? { ...f, priority: Number(e.target.value) } : f)}
                  min={1}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCollectionSave} className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all">
                저장
              </button>
              <button onClick={() => { setCollectionForm(null); setEditingCollection(null); }} className="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Picker Modal */}
      {pickerCollection !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setPickerCollection(null); setPickerServices([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
              <h2 className="text-base font-bold text-zinc-950 mb-1">서비스 픽 관리</h2>
              <p className="text-xs text-zinc-500">테마: <strong>{pickerCollection.title}</strong></p>
              <input
                type="search"
                placeholder="서비스명 검색..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="mt-3 w-full h-9 px-3 rounded-xl border border-zinc-200 text-sm bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-2">
              {pickerLoading && <p className="text-center text-sm text-zinc-400 py-8">로딩 중...</p>}
              {!pickerLoading && allApprovedServices
                .filter((s) => s.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((s) => {
                  const checked = pickerServices.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setPickerServices((prev) => checked ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                        className="w-4 h-4 rounded accent-violet-600 shrink-0"
                      />
                      <div className={`w-8 h-8 rounded-lg shrink-0 bg-gradient-to-br ${s.thumbnail_gradient} flex items-center justify-center`}>
                        <span className="text-white/40 text-xs font-black">{s.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{s.category} · ♥ {s.upvotes}</p>
                      </div>
                    </label>
                  );
                })}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-400">{pickerServices.length}개 선택됨</span>
              <div className="flex gap-2">
                <button onClick={() => { setPickerCollection(null); setPickerServices([]); }} className="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors">
                  취소
                </button>
                <button onClick={handlePickerSave} disabled={pickerSaving} className="h-9 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60">
                  {pickerSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
