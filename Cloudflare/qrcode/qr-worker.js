import QRCode from "qrcode";

function renderDocPage() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>QR API</title>
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #f4f6f9;
  margin: 0;
  padding: 20px;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.03);
  position: relative; /* 为复制按钮定位做准备 */
}

h1 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 24px;
  color: #0f172a;
}

h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 16px;
  color: #334155;
}

p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* 代码块外层包裹，用于定位复制按钮 */
.code-wrapper {
  position: relative;
}

/* 深色现代代码块风格：开启自动换行，禁止左右滑动 */
pre {
  background: #1e293b;
  color: #f8fafc;
  padding: 14px;
  padding-right: 70px; /* 留出右侧复制按钮的空间 */
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  
  white-space: pre-wrap;       
  word-wrap: break-word;       
  word-break: break-all;       
  overflow-x: hidden;          
}

/* 一键复制按钮样式 */
.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  margin: 0;
  padding: 6px 10px;
  width: auto;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}
.copy-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.copy-btn.copied {
  background: #10b981;
  color: white;
}

/* 输入框尺寸与样式重构 */
input {
  width: 100%;
  box-sizing: border-box; 
  padding: 12px 16px;
  border-radius: 10px;
  border: 2px solid #e2e8f0;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #f8fafc;
}

input:focus {
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* 主提交按钮 */
.gen-btn {
  width: 100%; 
  margin-top: 12px;
  padding: 12px 16px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.gen-btn:hover {
  background: #2563eb;
}

.gen-btn:active {
  transform: scale(0.98); 
}

/* 二维码输出区域优化 */
#out {
  display: flex;
  justify-content: center;
  align-items: center;
}

img {
  margin-top: 20px;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 8px;
  background: white;
  border: 1px solid #e2e8f0;
}
</style>
</head>

<body>
<div class="container">

<div class="card">
<h1>QR Code API</h1>
<p>Simple QR Code generator API</p>
</div>

<div class="card">
<h3>Endpoint (Custom Size & ECC)</h3>
<div class="code-wrapper">
<pre id="ep1">/?size=500x500&ecc=H&data=hello</pre>
<button class="copy-btn" onclick="copyText('ep1', this)">Copy</button>
</div>
</div>

<div class="card">
<h3>Endpoint (PNG Format)</h3>
<div class="code-wrapper">
<pre id="ep2">/?format=png&data=hello</pre>
<button class="copy-btn" onclick="copyText('ep2', this)">Copy</button>
</div>
</div>

<div class="card">
<h3>Parameters</h3>
<div class="code-wrapper">
<pre id="params">
data   (required必须)
size   (optional可选, default 300x300)
margin (optional可选, default 1)
ecc    (optional可选, L/M/Q/H)
format (png for Image, svg for default)
</pre>
<button class="copy-btn" onclick="copyText('params', this)">Copy</button>
</div>
</div>

<div class="card">
<h3>Try it</h3>
<input id="text" placeholder="Enter text or URL..." />
<button class="gen-btn" onclick="gen()">Generate QR</button>

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

// 一键复制核心逻辑
function copyText(elementId, btn) {
  const text = document.getElementById(elementId).innerText.trim();
  
  // 使用现代 Clipboard API 复制文本
  navigator.clipboard.writeText(text).then(() => {
    btn.innerText = 'Copied!';
    btn.classList.add('copied');
    
    // 1.5秒后恢复原状
    setTimeout(() => {
      btn.innerText = 'Copy';
      btn.classList.remove('copied');
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
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

    // 无参数返回原文档页面（HTML 完全未改动）
    if (!data) {
      return new Response(renderDocPage(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      });
    }

    // 解析原有参数
    const size = parseInt((url.searchParams.get("size") || "300x300").split("x")[0], 10);
    const margin = parseInt(url.searchParams.get("margin") || "1");
    const ecc = (url.searchParams.get("ecc") || "M").toUpperCase();
    const level = ["L","M","Q","H"].includes(ecc) ? ecc : "M";
    // 新增 format 参数：png 输出位图(适配Excel)，svg 保留原有矢量图
    const format = (url.searchParams.get("format") || "svg").toLowerCase();

    // 分支逻辑
    if (format === "png") {
      // 代理公共接口输出 PNG，Excel 专用
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&margin=${margin}&ecc=${level}&data=${encodeURIComponent(data)}`;
      const imgRes = await fetch(apiUrl);
      return new Response(imgRes.body, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public,max-age=86400"
        }
      });
    } else {
      // 默认 SVG，保留原有逻辑，网页端正常使用
      const svg = await QRCode.toString(data, {
        type: "svg",
        width: size,
        margin,
        errorCorrectionLevel: level
      });
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public,max-age=86400"
        }
      });
    }
  }
};
