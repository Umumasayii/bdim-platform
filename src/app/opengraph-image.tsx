import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Big Data IQ Minds — We Turn Data Into Decisions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logo = await readFile(path.join(process.cwd(), "public/brand/bdim-logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff" }}>
        <div style={{ width: 600, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires <img> */}
          <img src={src} width={500} height={368} alt="" />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
            background: "#052553",
            color: "white",
          }}
        >
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.08 }}>We Turn Data Into Decisions.</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#9ae0b5", lineHeight: 1.4 }}>
            Data analytics · Statistics · AI · Business intelligence · GIS
          </div>
          <div style={{ marginTop: 36, fontSize: 24, color: "#a9c4e8" }}>Kigali, Rwanda</div>
        </div>
      </div>
    ),
    size,
  );
}
