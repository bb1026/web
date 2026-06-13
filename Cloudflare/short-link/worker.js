function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function randomCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// 管理员登录校验
function checkAdminAuth(req, env) {
  const auth = req.headers.get("authorization");
  const adminUser = env.ADMIN_USER || "admin";
  const adminPwd = env.ADMIN_PASSWORD;
  if (!adminPwd) return false;
  if (!auth || !auth.startsWith("Basic ")) return false;
  try {
    const [user, pwd] = atob(auth.slice(6)).split(":");
    return user === adminUser && pwd === adminPwd;
  } catch {
    return false;
  }
}

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;

    // ========== 公开短链跳转（无需登录） ==========
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const { results } = await env.DB.prepare("SELECT * FROM links WHERE code = ?").bind(code).all();
      const link = results[0];
      if (!link) return new Response("Not Found", { status: 404 });
      if (Number(link.enabled) !== 1) return new Response("Disabled", { status: 403 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(link.url, 302);
    }

    // ========== 公开：独立生成短链页面 /shortlink ==========
    if (path === "/shortlink") {
      const createPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>短链接生成器</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui}
body{background:#f5f7fa;padding:40px;max-width:600px;margin:0 auto}
.box{background:#fff;padding:30px;border-radius:12px;box-shadow:0 2px 12px #00000010}
h2{margin-bottom:24px;color:#222}
.input-item{margin-bottom:16px}
label{display:block;margin-bottom:6px;color:#444}
input{width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:8px;font-size:16px}
button{width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}
button:hover{background:#1d4ed8}
.result{margin-top:20px;padding:16px;border-radius:8px;display:none}
.success{background:#ecfdf3;border:1px solid #10b981;color:#047857}
.copy-btn{margin-top:10px;padding:8px 16px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer}
</style>
</head>
<body>
<div class="box">
  <h2>快速生成短链接</h2>
  <div class="input-item">
    <label>原始长链接</label>
    <input id="longUrl" placeholder="https://xxx.com">
  </div>
  <div class="input-item">
    <label>自定义短码（留空自动生成）</label>
    <input id="customCode" placeholder="可选">
  </div>
  <button onclick="genLink()">立即生成</button>

  <div id="resultBox" class="result success">
    <div>生成成功！短链接：<span id="shortLink"></span></div>
    <button class="copy-btn" onclick="copyLink()">复制链接</button>
  </div>
</div>

<script>
let origin = location.origin;
async function genLink(){
  const url = document.getElementById('longUrl').value.trim();
  const code = document.getElementById('customCode').value.trim();
  if(!url){alert('请输入长链接');return;}
  const res = await fetch('/api/create',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url,code})
  });
  const data = await res.json();
  const fullShort = data.shortUrl;
  document.getElementById('shortLink').innerText = fullShort;
  document.getElementById('resultBox').style.display = 'block';
}
async function copyLink(){
  const text = document.getElementById('shortLink').innerText;
  await navigator.clipboard.writeText(text);
  alert('已复制到剪贴板');
}
</script>
</body>
</html>`;
      return html(createPage);
    }

    // ========== 接口：创建短链（公开调用） ==========
    if (path === "/api/create" && req.method === "POST") {
      const { url: longUrl, code } = await req.json();
      const shortCode = code || randomCode();
      await env.DB.prepare("INSERT OR IGNORE INTO links (code, url) VALUES (?, ?)").bind(shortCode, longUrl).run();
      return json({ ok: true, code: shortCode, shortUrl: `${urlObj.origin}/s/${shortCode}` });
    }

    // ========== 以下接口需要管理员登录 ==========
    const needAuthPaths = ["/api/list", "/api/delete/", "/api/toggle/", "/admin"];
    const needAuth = needAuthPaths.some(p => path === p || path.startsWith(p));
    if (needAuth) {
      if (!checkAdminAuth(req, env)) {
        return new Response("需要管理员登录", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="管理后台登录"' }
        });
      }
    }

    // 列表接口
    if (path === "/api/list") {
      const { results } = await env.DB.prepare("SELECT * FROM links ORDER BY id DESC LIMIT 100").all();
      return json(results);
    }

    // 删除
    if (path.startsWith("/api/delete/")) {
      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?").bind(code).run();
      return json({ ok: true });
    }

    // 启用/禁用
    if (path.startsWith("/api/toggle/")) {
      const code = path.split("/api/toggle/")[1];
      await env.DB.prepare("UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE code=?").bind(code).run();
      return json({ ok: true });
    }

    // ========== 管理员后台（登录保护） ==========
    if (path === "/admin") {
      const adminPage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>短链接管理后台</title>
<style>
body{font-family:Arial;background:#111;color:#fff;padding:20px}
input,button{padding:10px;margin:5px}
.card{background:#1e1e1e;padding:10px;margin:10px 0;border-radius:6px}
button{cursor:pointer}
</style>
</head>
<body>
<h2>短链接后台管理</h2>
<h3>全部链接列表</h3>
<div id="list"></div>

<script>
async function load(){
  const res = await fetch('/api/list');
  const data = await res.json();
  let htmlStr = '';
  data.forEach(item=>{
    htmlStr += '<div class="card"><b>'+item.code+'</b><br>'+item.url+'<br>点击:'+item.clicks+' | 状态:'+(item.enabled?'启用':'禁用')+'<br><br><button onclick="toggle(\''+item.code+'\')">启用/禁用</button><button onclick="del(\''+item.code+'\')">删除</button></div>';
  });
  document.getElementById('list').innerHTML = htmlStr;
}
async function del(c){await fetch('/api/delete/'+c);load();}
async function toggle(c){await fetch('/api/toggle/'+c);load();}
load();
</script>
</body></html>`;
      return html(adminPage);
    }

    return new Response("OK");
  }
};
