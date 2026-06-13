function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8" }
  });
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}

function randomCode(len = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let res = "";
  for (let i = 0; i < len; i++) {
    res = res + chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

const ADMIN_COOKIE_KEY = "admin_auth";
const ADMIN_COOKIE_VAL = "valid_admin_2026";

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;
    const method = req.method;

    // OPTIONS预检统一处理
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": urlObj.origin,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    function getCookie(name) {
      const cookieStr = req.headers.get("Cookie") || "";
      const cookieParts = {};
      cookieStr.split("; ").forEach(item => {
        const [k, v] = item.split("=");
        cookieParts[k] = v;
      });
      return cookieParts[name] || "";
    }

    function isLogin() {
      return getCookie(ADMIN_COOKIE_KEY) === ADMIN_COOKIE_VAL;
    }

    // 短链跳转
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const resDB = await env.DB.prepare("SELECT url FROM links WHERE code = ? AND enabled = 1").bind(code).all();
      if (resDB.results.length === 0) return new Response("404 短链接不存在或已禁用", { status: 404 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(resDB.results[0].url, 302);
    }

    // 短链接生成页面
    if (path === "/shortlink") {
      const pageHtml = `
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
.open-btn{margin-left:10px;padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;}
.open-btn:active{opacity:0.85;}
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
    <button class="open-btn" onclick="openLink()">打开链接</button>
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
      credentials: 'include',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({url:longUrl,code:customCode})
    });
    if (!resp.ok) throw new Error('服务端异常');
    const data = await resp.json();
    if (!data.ok) {
      alert('生成失败');
      return;
    }
    linkText.textContent = data.shortUrl;
    resBox.style.display = 'block';
  } catch (err) {
    alert(err.message);
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
function openLink(){
  const target = document.getElementById('shortLink').innerText.trim();
  window.open(target, '_blank');
}
</script>
</body>
</html>`;
      return html(pageHtml);
    }

    // 创建短链接口
    if (path === "/api/create" && method === "POST") {
      try {
        const body = await req.json();
        const longUrl = body.url;
        const code = body.code || randomCode();
        await env.DB.prepare("INSERT OR IGNORE INTO links (code, url, clicks, enabled) VALUES (?, ?, 0, 1)").bind(code, longUrl).run();
        return json({ok:true,code:code,shortUrl:urlObj.origin + "/s/" + code});
      } catch (e) {
        return json({ok:false,err:e.message},500);
      }
    }

    // 登录接口
    if (path === "/api/admin/login" && method === "POST") {
      const body = await req.json();
      if (body.pwd === env.ADMIN_PASSWORD) {
        const resp = json({ok:true});
        resp.headers.append("Set-Cookie",ADMIN_COOKIE_KEY + "=" + ADMIN_COOKIE_VAL + "; Path=/; HttpOnly; SameSite=Lax; Secure");
        return resp;
      } else {
        return json({ok:false,msg:"密码错误"},401);
      }
    }

    // 退出登录接口
    if (path === "/api/admin/logout") {
      const resp = json({ok:true});
      resp.headers.append("Set-Cookie",ADMIN_COOKIE_KEY + "=; Path=/; HttpOnly; Max-Age=0; Secure");
      return resp;
    }

    // 管理后台页面（修复退出：不再等待fetch回调，强制location直接跳转）
    if (path === "/admin") {
      if (!isLogin()) {
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
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pwd:pwd})
  });
  const data = await res.json();
  if(data.ok){
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

      // 已登录后台主页：退出按钮直接location跳转，不再异步等待接口
      const adminHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>短链接管理后台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;}
body{background:#ffffff;color:#222;padding:20px;line-height:1.6;}
.top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
h2{color:#111;}
#logoutBtn{padding:10px 22px;background:#dc3545;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;transition:0.2s;box-shadow:0 2px 6px #00000018;}
#logoutBtn:hover{background:#bb2d3b;}
.card{background:#f8f9fa;border:1px solid #e9ecef;padding:14px;border-radius:8px;margin-bottom:12px;}
.card b{color:#0d6efd;font-size:16px;}
.card button{margin:4px 6px 0 0;padding:7px 12px;border:none;border-radius:6px;cursor:pointer;font-size:14px;}
.btn-toggle{background:#198754;color:#fff;}
.btn-del{background:#fd7e14;color:#fff;}
.load-tip{color:#666;padding:12px;}
</style>
</head>
<body>
<div class="top-bar">
  <h2>短链接管理后台</h2>
  <button id="logoutBtn">🚪 退出登录</button>
</div>
<div id="list" class="load-tip">正在加载数据...</div>

<script>
// 修复退出：先跳转，后端Cookie同步失效，不再依赖fetch回调
document.getElementById('logoutBtn').onclick = function(){
  fetch('/api/admin/logout', {credentials:'include'});
  location.href = "/admin";
};

async function loadList(){
  try {
    const res = await fetch('/api/list', {credentials:'include'});
    const data = await res.json();
    let htmlStr = '';
    data.forEach(item=>{
      htmlStr += '<div class="card"><b>' + item.code + '</b><br>原链接：' + item.url + '<br>点击量：' + item.clicks + ' | 状态：' + (item.enabled?'启用':'禁用') + '<br><button class="btn-toggle" onclick="toggle(\'' + item.code + '\')">启用/禁用</button><button class="btn-del" onclick="del(\'' + item.code + '\')">删除</button></div>';
    });
    document.getElementById('list').innerHTML = htmlStr || '<div class="load-tip">暂无数据</div>';
  } catch(err){
    document.getElementById('list').innerHTML = '加载失败：' + err.message;
  }
}

async function del(code){
  if(!confirm('确定删除？')) return;
  await fetch('/api/delete/' + code, {credentials:'include'});
  loadList();
}
async function toggle(code){
  await fetch('/api/toggle/' + code, {credentials:'include'});
  loadList();
}

loadList();
</script>
</body>
</html>`;
      return html(adminHtml);
    }

    // 极简列表接口：无分页、无搜索，先保证能返回数据
    if (path === "/api/list") {
      if (!isLogin()) return json({ok:false},401);
      try {
        const resDB = await env.DB.prepare("SELECT * FROM links ORDER BY id DESC").all();
        return json(resDB.results);
      } catch (e) {
        return json({ok:false,msg:e.message},500);
      }
    }

    // 删除接口
    if (path.startsWith("/api/delete/")) {
      if (!isLogin()) return json({ok:false},401);
      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?").bind(code).run();
      return json({ok:true});
    }

    // 启用禁用接口
    if (path.startsWith("/api/toggle/")) {
      if (!isLogin()) return json({ok:false},401);
      const code = path.split("/api/toggle/")[1];
      await env.DB.prepare("UPDATE links SET enabled = NOT enabled WHERE code = ?").bind(code).run();
      return json({ok:true});
    }

    return new Response("404 页面不存在",{status:404});
  }
};