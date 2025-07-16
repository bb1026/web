export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      return await handleUpload(request, env);
    }

    if (url.pathname.startsWith('/download/')) {
      const key = decodeURIComponent(url.pathname.replace('/download/', ''));
      return await handleDownload(key, env);
    }

    return new Response('API 正常运行', { status: 200 });
  }
};

// 上传文件
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !file.name) {
    return jsonResponse({ error: '未找到文件' }, 400);
  }

  if (file.size > 50 * 1024 * 1024) {
    return jsonResponse({ error: '文件大小超限（50MB）' }, 400);
  }

  const fileKey = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

  await env.R2_BUCKET.put(fileKey, file.stream());

  const downloadUrl = `/download/${encodeURIComponent(fileKey)}`;

  return jsonResponse({ downloadUrl });
}

// 下载文件
async function handleDownload(fileKey, env) {
  const object = await env.R2_BUCKET.get(fileKey);

  if (!object) {
    return new Response('文件不存在或已删除', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Disposition': `attachment; filename="${fileKey.split('-').slice(2).join('-')}"`,
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 允许跨域上传
function handleOptions() {
  return new Response('', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}