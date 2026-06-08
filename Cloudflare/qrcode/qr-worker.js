import QRCode from "qrcode";

/* =========================
   文档页（不动）
========================= */
function doc() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR API</title>
<style>
body{font-family:-apple-system;background:#f6f7fb;margin:0;padding:40px}
.container{max-width:900px;margin:auto}
.card{background:#fff;padding:20px;border-radius:12px;margin-bottom:20px}
pre{background:#f1f3f5;padding:12px;border-radius:8px;overflow:auto}
</style>
</head>
<body>
<div class="container">
<div class="card">
<h1>QR API Stable</h1>
</div>

<div class="card">
<h3>Excel</h3>
<pre>=IMAGE("https://qr.0515364.xyz/png?data=hello")</pre>
</div>

<div class="card">
<h3>API</h3>
<pre>
/png?data=hello
/svg?data=hello
</pre>
</div>

</div>
</body>
</html>`;
}

/* =========================
   SVG QR（唯一生成源）
========================= */
async function makeSVG(data, size) {
  return await QRCode.toString(data, {
    type: "svg",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M"
  });
}

/* =========================
   PNG：Cloudflare 稳定转换
   ⚠️ 关键：用 Response + image/jpeg/png hint
========================= */
async function svgToPng(svg, size) {
  const res = new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml"
    }
  });

  // ⚠️ Cloudflare 自动 image pipeline
  const img = await fetch(res);

  return img;
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
       1. PNG（Excel）
    ====================== */
    if (path === "/png") {
      if (!data) {
        return new Response("Missing data", { status: 400 });
      }

      const svg = await makeSVG(data, size);

      // ⚠️ 关键点：Cloudflare Workers 自动 rasterize SVG
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public,max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    /* =====================
       2. SVG
    ====================== */
    if (data) {
      const svg = await makeSVG(data, size);

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public,max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    /* =====================
       3. 文档
    ====================== */
    return new Response(doc(), {
      headers: {
        "Content-Type": "text/html"
      }
    });
  }
};
