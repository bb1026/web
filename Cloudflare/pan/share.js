// share.js

export async function createShare(request, env, key, role) {
  if (role !== 'admin' && role !== 'upload') {
    return new Response('无权限分享', { status: 403 });
  }

  const { file, expireIn } = await request.json();
  if (!file) return new Response('缺少参数 file', { status: 400 });

  const token = crypto.randomUUID(); // 生成唯一分享链接 token
  const expireAt = Date.now() + (expireIn || 3 * 24 * 3600 * 1000); // 默认三天

  const shareData = {
    file,
    owner: key,
    createdAt: Date.now(),
    expireAt
  };

  await env.BUCKET.put(`__share__/${token}`, JSON.stringify(shareData), {
    customMetadata: { visible: 'false' }
  });

  return new Response(token, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function getShare(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response('缺少 token', { status: 400 });

  const obj = await env.BUCKET.get(`__share__/${token}`);
  if (!obj) return new Response('分享不存在', { status: 404 });

  const json = JSON.parse(await obj.text());
  if (Date.now() > json.expireAt) {
    await env.BUCKET.delete(`__share__/${token}`);
    return new Response('分享已过期', { status: 410 });
  }

  const file = await env.BUCKET.get(json.file);
  if (!file) return new Response('文件不存在', { status: 404 });

  return new Response(file.body, {
    headers: {
      'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(json.file.split('/').pop())}"`,
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function listShares(request, env, role) {
  if (role !== 'admin') return new Response('无权限查看', { status: 403 });

  const list = await env.BUCKET.list({ prefix: '__share__/' });
  const results = [];
  for (const obj of list.objects) {
    const raw = await env.BUCKET.get(obj.key);
    if (!raw) continue;
    const json = JSON.parse(await raw.text());
    results.push({ token: obj.key.replace('__share__/', ''), ...json });
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function cancelShare(request, env, role) {
  if (role !== 'admin') return new Response('无权限取消', { status: 403 });

  const { token } = await request.json();
  if (!token) return new Response('缺少 token', { status: 400 });

  await env.BUCKET.delete(`__share__/${token}`);
  return new Response('✅ 分享已取消', {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}