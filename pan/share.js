const apiBase = "https://pan.0515364.xyz";

function getShareId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

function showError(message) {
  document.getElementById("share-content").innerHTML = `<p class="error">❌ ${message}</p>`;
}

async function loadSharedFile() {
  const id = getShareId();
  if (!id) return showError("无效的分享链接");

  try {
    const res = await fetch(`${apiBase}/share/get?token=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();

    const filename = decodeURIComponent(res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download');

    const url = URL.createObjectURL(blob);
    const container = document.getElementById("share-content");
    container.innerHTML = `
      <p>文件名：<strong>${filename}</strong></p>
      <a href="${url}" class="download-btn" download="${filename}">
        <i class="fas fa-download"></i> 点击下载
      </a>
    `;
  } catch (err) {
    showError(err.message);
  }
}

loadSharedFile();