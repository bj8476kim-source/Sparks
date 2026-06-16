// Sparks DB 타입 정의
// collections.sql 스키마와 동기화 유지

export interface Service {
  id: number;
  name: string;
  url: string;
  description: string;
  category: string;
  upvotes: number;
  thumbnail_gradient: string;
  thumbnail_url: string | null;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  created_at: string;
}

export interface CollectionServiceRow {
  collection_id: string;
  service_id: number;
  sort_order: number;
}

// Supabase 중첩 조인 응답 타입
// ai_services는 FK many-to-one이지만 Supabase JS가 배열로 반환
export interface CollectionWithServices extends Collection {
  collection_services: Array<{
    sort_order: number;
    ai_services: Service[];
  }>;
}
