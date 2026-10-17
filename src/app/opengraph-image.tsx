import { ImageResponse } from "next/og";

export const alt = "Big Data IQ Minds — We Turn Data Into Decisions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0b1b33", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, width: 72, height: 72, borderRadius: 18, background: "#17335d", padding: 14 }}>
            <div style={{ width: 12, height: 22, background: "#2fb7b0", borderRadius: 3 }} />
            <div style={{ width: 12, height: 34, background: "#62d2cb", borderRadius: 3 }} />
            <div style={{ width: 12, height: 46, background: "#46b46d", borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Big Data IQ Minds</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>We Turn Data Into Decisions.</div>
          <div style={{ marginTop: 24, fontSize: 30, color: "#9de6e1" }}>Data analytics · Statistics · AI · Business intelligence · GIS</div>
        </div>
        <div style={{ fontSize: 26, color: "#b0c6e4" }}>Data • Insights • Impact · Kigali, Rwanda</div>
      </div>
    ),
    size,
  );
}
