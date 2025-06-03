function showTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}

function restoreVBA() {
  const input = document.getElementById('vbaInput').value;
  const output = input.replace(/ChrW\((\d+)\)/g, (_, num) => String.fromCharCode(parseInt(num)));
  document.getElementById('vbaOutput').value = output;
}

function toBase64() {
  const input = document.getElementById('base64Input').value;
  document.getElementById('base64Output').value = btoa(unescape(encodeURIComponent(input)));
}

function fromBase64() {
  const input = document.getElementById('base64Input').value;
  try {
    document.getElementById('base64Output').value = decodeURIComponent(escape(atob(input)));
  } catch (e) {
    document.getElementById('base64Output').value = '解码失败：无效的 Base64 字符串';
  }
}

function formatJSON() {
  const input = document.getElementById('jsonInput').value;
  try {
    const obj = JSON.parse(input);
    document.getElementById('jsonOutput').value = JSON.stringify(obj, null, 2);
  } catch (e) {
    document.getElementById('jsonOutput').value = '格式化失败：请输入合法的 JSON';
  }
}
