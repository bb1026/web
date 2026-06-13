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
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// 固定登录Cookie密钥，无需改动
const ADMIN_COOKIE_KEY = "admin_auth";
const ADMIN_COOKIE_VAL = "valid_admin_2026";

export default {
  async fetch(req, env) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;

    // 读取Cookie工具函数
    function getCookie(name) {
      const cookieStr = req.headers.get("Cookie") || "";
      const pairs = cookieStr.split("; ").reduce((acc, curr) => {
        const [k, v] = curr.split("=");
        acc[k] = v;
        return acc;
      }, {});
      return pairs[name] || "";
    }

    // 校验是否已登录
    function isLogin() {
      return getCookie(ADMIN_COOKIE_KEY) === ADMIN_COOKIE_VAL;
    }

    // 短链跳转 /s/xxx
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];
      const { results } = await env.DB.prepare(
        "SELECT url FROM links WHERE code = ? AND enabled = 1"
      ).bind(code).all();
      if (results.length === 0) return new Response("404 短链接不存在或已禁用", { status: 404 });
      await env.DB.prepare("UPDATE links SET clicks = clicks + 1 WHERE code = ?").bind(code).run();
      return Response.redirect(results[0].url, 302);
    }

    // 短链接生成页面 /shortlink（复制+打开按钮完整保留）
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: longUrl,
        code: customCode
      })
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

function openLink(){
  const target = document.getElementById('shortLink').innerText.trim();
  window.open(target, '_blank');
}
</script>
</body>
</html>`;
      return html(createPage);
    }

    // 创建短链接口
    if (path === "/api/create" && req.method === "POST") {
      try {
        const body = await req.json();
        const longUrl = body.url;
        const code = body.code || randomCode();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO links (code, url, clicks, enabled) VALUES (?, ?, 0, 1)"
        ).bind(code, longUrl).run();
        return json({
          ok: true,
          code,
          shortUrl: `${urlObj.origin}/s/${code}`
        });
      } catch (e) {
        return json({ ok: false, err: e.message }, 500);
      }
    }

    // 管理员登录接口（后端设置Cookie，不再依赖localStorage）
    if (path === "/api/admin/login" && req.method === "POST") {
      const { pwd } = await req.json();
      if (pwd === env.ADMIN_PASSWORD) {
        // 下发登录Cookie，浏览器自动持久化
        const resp = json({ ok: true });
        resp.headers.append("Set-Cookie", `${ADMIN_COOKIE_KEY}=${ADMIN_COOKIE_VAL}; Path=/; HttpOnly; SameSite=Lax`);
        return resp;
      } else {
        return json({ ok: false, msg: "密码错误" }, 401);
      }
    }

    // 管理后台入口
    if (path === "/admin") {
      // 已登录，直接渲染后台页面
      if (isLogin()) {
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
async function loadData(){
  const res = await fetch('/api/list');
  const data = await res.json();
  let htmlStr = '';
  data.forEach(item=>{
    htmlStr += '<div class="card"><b>'+item.code+'</b><br>'
      + item.url + '<br>点击量：'+item.clicks+' | 状态：'+(item.enabled?'启用':'禁用')
      + '<br><button onclick="toggle(\''+item.code+'\')">启用/禁用</button>'
      + '<button onclick="del(\''+item.code+'\')">删除</button></div>';
  });
  document.getElementById('list').innerHTML = htmlStr;
}

async function del(code){
  if(!confirm('确定删除该短链接？')) return;
  await fetch('/api/delete/'+code);
  loadData();
}

async function toggle(code){
  await fetch('/api/toggle/'+code);
  loadData();
}

// 退出清除Cookie
async function logout(){
  await fetch('/api/admin/logout');
  location.reload();
}

loadData();
</script>
</body>
</html>`;
        return html(adminPage);
      }

      // 未登录，渲染登录页
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
    // 登录成功直接刷新页面，浏览器自动携带Cookie
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

    // 退出登录接口，清空Cookie
    if (path === "/api/admin/logout") {
      const resp = json({ ok: true });
      resp.headers.append("Set-Cookie", `${ADMIN_COOKIE_KEY}=; Path=/; HttpOnly; Max-Age=0`);
      return resp;
    }

    // 后台列表接口（自动携带Cookie，无需手动加header）
    if (path === "/api/list") {
      if (!isLogin()) return json({ ok: false }, 401);
      const { results } = await env.DB.prepare("SELECT * FROM links ORDER BY id DESC").all();
      return json(results);
    }

    // 删除短链接口
    if (path.startsWith("/api/delete/")) {
      if (!isLogin()) return json({ ok: false }, 401);
      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?").bind(code).run();
      return json({ ok: true });
    }

    // 启用/禁用接口
    if (path.startsWith("/api/toggle/")) {
      if (!isLogin()) return json({ ok: false }, 401);
      const code = path.split("/api/toggle/")[1];
      await env.DB.prepare(
        "UPDATE links SET enabled = NOT enabled WHERE code = ?"
      ).bind(code).run();
      return json({ ok: true });
    }

    return new Response("页面不存在", { status: 404 });
  }
};