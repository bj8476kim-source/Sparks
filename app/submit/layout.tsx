import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 등록하기',
  description: 'AI로 만든 내 서비스를 Sparks에 등록하세요. 검토 후 모두에게 소개됩니다.',
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
