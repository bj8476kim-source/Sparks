import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import { SITE_URL } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sparks — 일반인이 AI로 만든 서비스 모음",
    template: "%s | Sparks",
  },
  description:
    "코딩 몰라도 괜찮아요. 일반인이 AI로 만든 기발하고 창의적인 서비스 쇼케이스. 재미·게임·창작·일상·공부·비즈니스 카테고리의 AI 서비스를 발견하고, 나만의 서비스도 등록해보세요.",
  keywords: [
    "AI 서비스", "AI 도구 모음", "인공지능 서비스", "노코드 AI", "AI 쇼케이스",
    "AI 만들기", "일반인 AI", "스파크스", "Sparks",
  ],
  openGraph: {
    title: "Sparks — 일반인이 AI로 만든 서비스 모음",
    description: "코딩 몰라도 괜찮아요. AI로 만든 창의적인 서비스를 발견하세요.",
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "Sparks",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sparks — 일반인이 AI로 만든 서비스 모음",
    description: "코딩 몰라도 괜찮아요. AI로 만든 창의적인 서비스를 발견하세요.",
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sparks",
  description: "일반인이 AI로 만든 서비스 쇼케이스 플랫폼",
  url: SITE_URL,
  inLanguage: "ko",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[500] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:text-sm focus:font-semibold focus:rounded-lg focus:shadow-lg"
        >
          본문으로 건너뛰기
        </a>
        <Providers>{children}</Providers>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YDK8SL1H93"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YDK8SL1H93');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "x7wikugujj");
          `}
        </Script>
      </body>
    </html>
  );
}
