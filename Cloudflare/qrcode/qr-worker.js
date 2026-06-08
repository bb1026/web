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
<pre>https://qr.0515364.xyz/?data=hello&size=500x500&ecc=H</pre>
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

    // ❌ 防止 Excel 误触
    if (!data) {
      return new Response("Missing data", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const size = parseInt(url.searchParams.get("size") || "300", 10);

    const options = {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M"
    };

    const path = url.pathname.toLowerCase();

    // =========================
    // ✔ Excel 专用 PNG
    // =========================
    if (path.includes("/png")) {
      const buffer = await QRCode.toBuffer(data, options);

      return new Response(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public,max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // =========================
    // ✔ SVG 默认
    // =========================
    const svg = await QRCode.toString(data, {
      ...options,
      type: "svg"
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public,max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
