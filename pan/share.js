const apiBase = location.origin;
function getParam(k){return new URLSearchParams(location.search).get(k);}
function showError(msg){document.getElementById('share-content').innerHTML=`<p class="error">❌ ${msg}</p>`;}

async function load() {
  const token = getParam('token'), pwd = getParam('password');
  if (!token) return showError('无效分享');
  let res = await fetch(`${apiBase}/share/get?token=${encodeURIComponent(token)}${pwd?'&password='+encodeURIComponent(pwd):''}`);
  if (!res.ok) return showError(await res.text());
  const file = await res.json();
  document.getElementById('share-content').innerHTML = `<p>文件名：<strong>${file.name}</strong></p><p>大小：${file.size} B</p>`;
  const btn = document.getElementById('download-btn');
  btn.href = `${apiBase}/share/get?token=${encodeURIComponent(token)}${pwd?'&password='+encodeURIComponent(pwd):''}`;
  document.getElementById('download-area').classList.remove('hidden');
}

load();