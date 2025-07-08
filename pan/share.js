document.getElementById("accessBtn").addEventListener("click", async () => {
  const id = document.getElementById("shareId").value.trim().replace(/.*\/([^/]+)$/, '$1');
  const pwd = document.getElementById("sharePwd").value.trim();
  const result = document.getElementById("result");

  if (!id || !pwd) {
    result.textContent = "❗️请填写分享ID和密码";
    return;
  }

  result.textContent = "⏳ 正在验证分享信息...";

  try {
    const res = await fetch(`/api/share/${id}?pwd=${encodeURIComponent(pwd)}`);
    const data = await res.json();

    if (res.ok && data && data.item) {
      result.innerHTML = `
        ✅ 分享内容：<br/>
        类型：${data.item.type}<br/>
        路径：<code>${data.item.path}</code><br/>
        上传者：${data.uploader}<br/>
        <br/>
        <a href="/api/download?path=${encodeURIComponent(data.item.path)}" target="_blank">⬇️ 下载链接</a>
      `;
    } else {
      result.textContent = data?.error || "分享不存在或密码错误。";
    }
  } catch (err) {
    result.textContent = "请求失败，请稍后重试。";
  }
});