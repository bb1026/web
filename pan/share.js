const api = 'https://pan.0515364.xyz/share/get';

async function loadShareInfo() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const password = params.get('password') || '';

  if (!id) {
    showError('缺少分享ID');
    return;
  }

  try {
    const res = await fetch(`${api}?id=${encodeURIComponent(id)}&password=${encodeURIComponent(password)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || '获取分享失败');
      return;
    }

    document.getElementById('status').classList.add('hidden');
    document.getElementById('result').classList.remove('hidden');
    document.getElementById('filename').textContent = data.file;
    document.getElementById('expires').textContent = new Date(data.expiresAt).toLocaleString();
    document.getElementById('download-link').href = `https://pan.0515364.xyz/download?file=${encodeURIComponent(data.file)}`;
  } catch (err) {
    showError('加载失败：' + err.message);
  }
}

function showError(msg) {
  document.getElementById('status').classList.add('hidden');
  const errEl = document.getElementById('error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

loadShareInfo();