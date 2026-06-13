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

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;

    // 短链跳转 /s/xxx 不变
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const { results } = await env.DB.prepare("SELECT * FROM links WHERE code = ?").bind(code).all();
      const link = results[0];
      if (!link) return new Response("Not Found", { status: 404 });
      if (Number(link.enabled) !== 1) return new Response("Disabled", { status: 403 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(link.url, 302);
    }

    // /shortlink 生成页面 完全保留之前修复好的代码，无改动
    if (path === "/shortlink") {
      const createPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>短链接生成器</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui, -apple-system, sans-serif;}
body{background:#f5f7fa;padding:20px 16px;min-height:100vh;}
.box{background:#fff;padding:24px 20px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;margin:0 auto;}
h2{margin-bottom:22px;color:#222;font-size:22px;text-align:center;}
.input-item{margin-bottom:16px;}
label{display:block;margin-bottom:6px;color:#444;font-size:15px;}
input{width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:8px;font-size:16px;outline:none;transition:border 0.2s;}
input:focus{border-color:#2563eb;}
#submitBtn{width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;transition:background 0.2s;}
#submitBtn:hover{background:#1d4ed8;}
#submitBtn:disabled{background:#94b3f0;cursor:not-allowed;}
.result{margin-top:20px;padding:16px;border-radius:8px;display:none;word-break:break-all;}
.success{background:#ecfdf3;border:1px solid #10b981;color:#047857;}
.copy-btn{margin-top:12px;padding:9px 18px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;}
.copy-btn:active{opacity:0.85;}
</style>
</head>
<body>
<div class="box">
  <h2>快速生成短链接</h2>
  <div class="input-item">
    <label>原始长链接</label>
    <input id="longUrl" placeholder="https://example.com">
  </div>
  <div class="input-item">
    <label>自定义短码（留空自动随机生成）</label>
    <input id="customCode" placeholder="可选填写">
  </div>
  <button id="submitBtn" onclick="genLink()">立即生成</button>

  <div id="resultBox" class="result success">
    <div>✅ 生成成功！</div>
    <div style="margin:8px 0;">短链接：<span id="shortLink"></span></div>
    <button class="copy-btn" onclick="copyLink()">复制链接</button>
  </div>
</div>

<script>
const btn = document.getElementById('submitBtn');
async function genLink(){
  const longUrl = document.getElementById('longUrl').value.trim();
  const customCode = document.getElementById('customCode').value.trim();
  const resBox = document.getElementById('resultBox');
  const linkText = document.getElementById('shortLink');

  if (!longUrl) {
    alert('请填写原始长链接');
    return;
  }

  btn.disabled = true;
  btn.textContent = '生成中...';
  resBox.style.display = 'none';

  try {
    const resp = await fetch('/api/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: longUrl,
        code: customCode
      })
    });

    const data = await resp.json();
    if (!data.ok) {
      alert('生成失败');
      return;
    }
    linkText.textContent = data.shortUrl;
    resBox.style.display = 'block';
  } catch (err) {
    alert('网络请求失败，请稍后重试');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '立即生成';
  }
}

async function copyLink(){
  const text = document.getElementById('shortLink').innerText.trim();
  try {
    await navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板！');
  } catch(e) {
    alert('复制失败，请手动复制');
  }
}
</script>
</body>
</html>`;
      return html(createPage);
    }

    // 创建短链API 原样保留
    if (path === "/api/create" && req.method === "POST") {
      const { url: longUrl, code } = await req.json();
      const shortCode = code || randomCode();
      await env.DB.prepare("INSERT OR IGNORE INTO links (code, url) VALUES (?, ?)").bind(shortCode, longUrl).run();
      return json({ ok: true, code: shortCode, shortUrl: `${urlObj.origin}/s/${shortCode}` });
    }

    // 登录校验接口，新增
    if (path === "/api/admin/login" && req.method === "POST") {
      const { pwd } = await req.json();
      if (pwd === env.ADMIN_PASSWORD) {
        return json({ ok: true, token: "admin_session_valid" });
      } else {
        return json({ ok: false, msg: "密码错误" }, 401);
      }
    }

    // 管理后台：自定义网页密码框，不再浏览器弹窗，读取ADMIN_PASSWORD
    if (path === "/admin") {
      const token = req.headers.get("X-Admin-Token");
      if (token !== "admin_session_valid") {
        // 登录页
        const loginHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理员登录</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui}
body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;}
.login-box{background:#1e1e1e;padding:30px 24px;border-radius:10px;width:100%;max-width:380px;}
h2{text-align:center;margin-bottom:24px;font-size:20px;}
input{width:100%;padding:13px 14px;border-radius:8px;border:none;font-size:16px;margin-bottom:16px;outline:none;}
#loginBtn{width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;}
#loginBtn:active{opacity:0.9}
.err-tip{color:#ff6b6b;margin-bottom:12px;text-align:center;display:none;}
</style>
</head>
<body>
<div class="login-box">
  <h2>后台管理员登录</h2>
  <div id="errTip" class="err-tip">密码不正确</div>
  <input id="pwdInput" type="password" placeholder="请输入管理密码">
  <button id="loginBtn">登录</button>
</div>

<script>
const errTip = document.getElementById('errTip');
document.getElementById('loginBtn').onclick = async ()=>{
  const pwd = document.getElementById('pwdInput').value.trim();
  if(!pwd) return;
  const res = await fetch('/api/admin/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pwd})
  });
  const data = await res.json();
  if(data.ok){
    localStorage.setItem('adminToken','admin_session_valid');
    location.reload();
  }else{
    errTip.style.display='block';
  }
}
</script>
</body>
</html>`;
        return html(loginHtml);
      }

      // 已登录，后台列表页
      const adminPage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>短链接管理后台</title>
<style>
body{font-family:Arial;background:#111;color:#fff;padding:16px;}
button{padding:8px 10px;margin:4px;cursor:pointer;}
.card{background:#1e1e1e;padding:12px;margin:10px 0;border-radius:6px;word-break:break-all;}
</style>
</head>
<body>
<h2>短链接后台管理</h2>
<button onclick="logout()">退出登录</button>
<h3>全部链接列表</h3>
<div id="list"></div>

<script>
function getAuthHeaders(){
  return {
    'Content-Type':'application/json',
    'X-Admin-Token':localStorage.getItem('adminToken')
  }
}
async function load(){
  const res = await fetch('/api/list',{headers:getAuthHeaders()});
  const data = await res.json();
  let htmlStr = '';
  data.forEach(item=>{
    htmlStr += '<div class="card"><b>'+item.code+'</b><br>'+item.url+'<br>点击:'+item.clicks+' | 状态:'+(item.enabled?'启用':'禁用')+'<br><br><button onclick="toggle(\''+item.code+'\')">启用/禁用</button><button onclick="del(\''+item.code+'\')">删除</button></div>';
  });
  document.getElementById('list').innerHTML = htmlStr;
}
async function del(c){
  await fetch('/api/delete/'+c,{headers:getAuthHeaders()});
  load();
}
async function toggle(c){
  await fetch('/api/toggle/'+c,{headers:getAuthHeaders()});
  load();
}
function logout(){
  localStorage.removeItem('adminToken');
  location.reload();
}
load();
</script>
</body></html>`;
      return html(adminPage);
    }

    // 下面管理类接口统一校验token，原有逻辑完全不变
    const token = req.headers.get("X-Admin-Token");
    const validToken = "admin_session_valid";

    // 列表API
    if (path === "/api/list") {
      if (token !== validToken) return json({ok:false},401);
      const { results } = await env.DB.prepare("SELECT * FROM links ORDER BY id DESC LIMIT 100").all();
      return json(results);
    }

    // 删除API
    if (path.startsWith("/api/delete/")) {
      if (token !== validToken) return json({ok:false},401);
      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?").bind(code).run();
      return json({ ok: true });
    }

    // 启停API
    if (path.startsWith("/api/toggle/")) {
      if (token !== validToken) return json({ok:false},401);
      const code = path.split("/api/toggle/")[1];
      await env.DB.prepare("UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE code=?").bind(code).run();
      return json({ ok: true });
    }

    return new Response("OK");
  }
};