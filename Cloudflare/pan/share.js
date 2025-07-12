// share.js
export async function createShare(request, env, key, role) {
  if (role !== 'admin' && role !== 'upload') return new Response('无权限分享', { status: 403 });
  const { file, expireIn, password } = await request.json();
  if (!file) return new Response('缺少参数 file', { status: 400 });

  const token = crypto.randomUUID();
  const expireAt = Date.now() + (expireIn || 3 * 24 * 3600 * 1000);
  const shareData = { file, owner: key, createdAt: Date.now(), expireAt, password: password || null };

  await env.BUCKET.put(`__share__/${token}`, JSON.stringify(shareData), {
    customMetadata: { visible: 'false' }
  });
  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
  });
}

export async function getShare(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const pass = url.searchParams.get('password') || '';
  if (!token) return new Response('缺少 token', { status: 400 });

  const obj = await env.BUCKET.get(`__share__/${token}`);
  if (!obj) return new Response('分享不存在', { status: 404 });
  const json = JSON.parse(await obj.text());
  if (Date.now() > json.expireAt) { await env.BUCKET.delete(`__share__/${token}`); return new Response('分享已过期', { status: 410 }); }
  if (json.password && json.password !== pass) return new Response('密码错误', { status: 403 });

  const file = await env.BUCKET.get(json.file);
  if (!file) return new Response('文件不存在', { status: 404 });
  const info = {
    name: json.file.split('/').pop(),
    size: file.size
  };
  return new Response(JSON.stringify(info), {
    headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
  });
}

// download needs same checks, handled in getShare route