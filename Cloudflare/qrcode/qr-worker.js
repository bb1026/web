import QRCode from "qrcode";

/* =========================
   文档页（你可以后面再美化）
========================= */
function doc() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR API</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto;background:#f6f7fb;margin:0;padding:40px}
.container{max-width:900px;margin:auto}
.card{background:#fff;padding:20px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.06)}
pre{background:#f1f3f5;padding:12px;border-radius:8px;overflow:auto}
</style>
</head>
<body>
<div class="container">

<div class="card">
<h1>QR API (Production)</h1>
<p>Excel / Shortcuts / Browser 100% compatible</p>
</div>

<div class="card">
<h3>Excel</h3>
<pre>=IMAGE("https://qr.0515364.xyz/png?data=hello")</pre>
</div>

<div class="card">
<h3>API</h3>
<pre>
/png?data=hello   (Excel / Shortcuts)
/svg?data=hello   (browser)
/?data=hello      (svg default)
</pre>
</div>

</div>
</body>
</html>`;
}

/* =========================
   SVG → PNG（稳定核心）
========================= */
async function svgToPng(svg, size = 300) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const img = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, size, size);

  return await canvas.convertToBlob({ type: "image/png" });
}

/* =========================
   Worker
========================= */
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const data = url.searchParams.get("data");

    const size = parseInt(url.searchParams.get("size") || "300", 10);

    /* =====================
       1. PNG（Excel专用）
    ====================== */
    if (path === "/png") {
      if (!data) {
        return new Response(
          `Usage: /png?data=hello`,
          { status: 400, headers: { "Content-Type": "text/plain" } }
        );
      }

      try {
        const svg = await QRCode.toString(data, {
          type: "svg",
          width: size,
          margin: 1,
          errorCorrectionLevel: "M"
        });

        const pngBlob = await svgToPng(svg, size);

        return new Response(pngBlob, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public,max-age=86400",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff"
          }
        });
      } catch (e) {
        return new Response("PNG generation failed: " + e.message, {
          status: 500,
          headers: { "Content-Type": "text/plain" }
        });
      }
    }

    /* =====================
       2. SVG API
    ====================== */
    if (data) {
      const svg = await QRCode.toString(data, {
        type: "svg",
        width: size,
        margin: 1
      });

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public,max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    /* =====================
       3. 文档页
    ====================== */
    return new Response(doc(), {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  }
};
