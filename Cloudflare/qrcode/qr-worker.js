import QRCode from "qrcode";

function renderDocPage() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR API</title>
<style>
body { font-family: Arial; background:#0f0f0f; color:#fff; padding:40px; }
.container { max-width:800px; margin:auto; }
input, button {
  padding:10px;
  width:100%;
  margin-top:10px;
  border-radius:6px;
  border:none;
}
button { background:#4f7cff; color:white; cursor:pointer; }
pre { background:#1a1a1a; padding:15px; border-radius:8px; overflow:auto; }
img { margin-top:20px; max-width:100%; }
</style>
</head>
<body>
<div class="container">
<h1>QR Code API</h1>

<h3>Endpoint</h3>
<pre>https://qr.0515364.xyz/?data=hello&size=500x500&ecc=H</pre>

<h3>Parameters</h3>
<pre>
data   (required必须)
size   (optional可选, default 300x300)
margin (optional可选, default 1)
ecc    (optional可选 L/M/Q/H)
format (svg only recommended默认)
</pre>

<h3>Try it</h3>
<input id="text" placeholder="Enter text..." />
<button onclick="gen()">Generate QR</button>

<div id="out"></div>

<script>
function gen() {
  const val = document.getElementById('text').value;
  if (!val) return;

  const url = '/?data=' + encodeURIComponent(val);

  document.getElementById('out').innerHTML =
    '<h3>Preview:</h3><img src="' + url + '" />';
}
</script>

</div>
</body>
</html>
`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const data = url.searchParams.get("data");

    // =========================
    // 没参数 → 返回文档页
    // =========================
    if (!data) {
      return new Response(renderDocPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      });
    }

    // =========================
    // QR 生成
    // =========================
    const size = parseInt((url.searchParams.get("size") || "300x300").split("x")[0], 10);
    const margin = parseInt(url.searchParams.get("margin") || "1");
    const ecc = (url.searchParams.get("ecc") || "M").toUpperCase();

    const svg = await QRCode.toString(data, {
      type: "svg",
      width: size,
      margin,
      errorCorrectionLevel: ["L","M","Q","H"].includes(ecc) ? ecc : "M"
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public,max-age=86400"
      }
    });
  }
};