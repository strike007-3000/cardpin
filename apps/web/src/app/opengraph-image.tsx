import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const alt = "CardPin — Open-Source Card Rewards Optimizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0d1117", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 48 }}>
        <svg width="260" height="173" viewBox="0 0 48 32" fill="none">
          <rect x="3" y="4" width="42" height="24" rx="5.5" stroke="#58a6ff" strokeWidth="2.2" />
          <path d="M10 12a5 5 0 0 1 10 0c0 3.5-5 9-5 9s-5-5.5-5-9Z" fill="#58a6ff" />
          <circle cx="15" cy="12" r="2" fill="#0d1117" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>CardPin</div>
          <div style={{ fontSize: 36, color: "#8b949e" }}>Find the best card for every purchase</div>
        </div>
      </div>
    ),
    size,
  );
}
