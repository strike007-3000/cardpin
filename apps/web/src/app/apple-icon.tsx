import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="140" height="93" viewBox="0 0 48 32" fill="none">
          <rect x="3" y="4" width="42" height="24" rx="5.5" stroke="#fff" strokeWidth="2.2" />
          <path d="M10 12a5 5 0 0 1 10 0c0 3.5-5 9-5 9s-5-5.5-5-9Z" fill="#fff" />
          <circle cx="15" cy="12" r="2" fill="#2563eb" />
        </svg>
      </div>
    ),
    size,
  );
}
