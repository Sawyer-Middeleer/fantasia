import { ImageResponse } from "next/og";

export const alt = "Fantasia — micro tools for running a business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#090909",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "monospace",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "#00e5a0",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#00e5a0", fontSize: 28, fontWeight: 700 }}>
            {"\u25B6"}
          </span>
          <span style={{ color: "#ededed", fontSize: 28, fontWeight: 700 }}>
            fantasia
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Headline */}
          <div
            style={{
              display: "flex",
              color: "#ededed",
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            <span>Micro tools for running a business.</span>
          </div>

          {/* Subhead */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "#888888",
              fontSize: 26,
              lineHeight: 1.5,
              gap: 4,
            }}
          >
            <span>Open source CLI tools that solve real problems.</span>
            <span>Starting with CRM data hygiene.</span>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#00e5a0",
            borderRadius: 10,
            padding: "14px 28px",
            width: 300,
          }}
        >
          <span style={{ color: "#020d07", fontSize: 20, fontWeight: 700 }}>
            npx fantasia-sh
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
