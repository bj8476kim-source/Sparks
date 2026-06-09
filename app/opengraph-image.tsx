import { ImageResponse } from 'next/og';

export const alt = 'Sparks — 일반인이 AI로 만든 서비스 모음';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORIES = ['재미', '게임', '창작', '일상', '공부', '비즈니스'];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #3b82f6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 20,
          }}
        >
          ✨ Sparks
        </div>
        <div
          style={{
            fontSize: 34,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            marginBottom: 40,
            lineHeight: 1.4,
          }}
        >
          일반인이 AI로 만든 서비스 쇼케이스
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
