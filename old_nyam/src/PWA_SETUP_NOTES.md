# PWA Setup Notes

다른 에이전트가 layout.tsx를 수정할 때 아래 내용을 반영해주세요.

## layout.tsx에 추가할 내용

### metadata에 추가:
```tsx
export const metadata: Metadata = {
  title: "맛집 - 나만의 맛집 추천",
  description: "웹검색 기반 검증된 맛집 추천 서비스",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "맛집",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};
```

### `<head>` 내에 추가할 태그 (html 태그 안):
```html
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<meta name="mobile-web-app-capable" content="yes" />
```

## 아이콘 파일
public/icons/ 에 아래 파일 필요:
- icon-192x192.png
- icon-512x512.png
