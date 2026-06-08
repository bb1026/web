import QRCode from "qrcode";

function renderDocPage() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR API</title>
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial;
  background: #f6f7fb;
  margin: 0;
  padding: 40px;
  color: #111;
}

.container {
  max-width: 900px;
  margin: auto;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

h1 {
  margin-top: 0;
}

pre {
  background: #f1f3f5;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
}

button {
  margin-top: 10px;
  padding: 10px 14px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}

img {
  margin-top: 15px;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid #eee;
}
</style>
</head>

<body>
<div class="container">

<div class="card">
<h1>QR Code API</h1>
<p>Simple QR Code generator API built on Cloudflare Workers</p>
</div>

<div class="card">
<h3>Endpoint</h3>
<pre>https://qr.0515364.xyz/?data=hello&size=500x500&ecc=H&format=png</pre>
</div>

<div class="card">
<h3>Parameters</h3>

<pre>
data   (required必须)
size   (optional可选, default 300x300)
margin (optional可选, default 1)
ecc    (optional可选 L/M/Q/H)
format (svg (default) | png)
</pre>

</div>

<div class="card">
<h3>Try it</h3>
<input id="text" placeholder="Enter text..." />
<button onclick="gen()">Generate QR</button>

<div id="out"></div>
</div>

</div>

<script>
function gen() {
  const val = document.getElementById('text').value;
  if (!val) return;

  const url = '/?data=' + encodeURIComponent(val);

  document.getElementById('out').innerHTML =
    '<img src="' + url + '" />';
}
</script>

</body>
</html>
`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const data = url.searchParams.get("data");

    // =========================
    // 没 data → API 文档页
    // =========================
    if (!data) {
      return new Response(renderDocPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      });
    }

    // =========================
    // 参数
    // =========================
    const format = (url.searchParams.get("format") || "svg").toLowerCase();
    const size = parseInt((url.searchParams.get("size") || "300"), 10);
    const margin = parseInt(url.searchParams.get("margin") || "1", 10);
    const ecc = (url.searchParams.get("ecc") || "M").toUpperCase();

    const options = {
      width: size,
      margin,
      errorCorrectionLevel: ["L","M","Q","H"].includes(ecc) ? ecc : "M"
    };

    // =========================
    // SVG（默认，Excel最稳）
    // =========================
    if (format !== "png") {
      const svg = await QRCode.toString(data, {
        ...options,
        type: "svg"
      });

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // =========================
    // PNG（Excel IMAGE 也支持）
    // =========================
    const buffer = await QRCode.toBuffer(data, options);

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
