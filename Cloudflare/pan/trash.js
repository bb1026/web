import { jsonResponse } from './utils.js';

export async function handleTrash(path, request, env, key, role) {
  const url = new URL(request.url);

  if (path === 'trash/list' && role === 'admin') {
    const list = await env.BUCKET.list({ prefix: '__trash__/', include: ['customMetadata'] });
    return jsonResponse(list.objects.map(o => ({
      name: o.key.replace(/^__trash__\//, ''),
      deletedAt: o.customMetadata?.deletedAt
    })));
  }

  if (path === 'trash/restore' && role === 'admin') {
    const name = url.searchParams.get('file');
    const file = await env.BUCKET.get(`__trash__/${name}`);
    if (!file) return new Response('文件不存在', { status: 404 });

    const original = name.split('__')[0];
    await env.BUCKET.put(original, file.body, {
      customMetadata: { ...file.customMetadata, visible: 'true' }
    });
    await env.BUCKET.delete(`__trash__/${name}`);
    return new Response('✅ 已还原', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (path === 'trash/delete' && role === 'admin') {
    const name = url.searchParams.get('file');
    await env.BUCKET.delete(`__trash__/${name}`);
    return new Response('✅ 彻底删除成功', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response('未知回收操作', { status: 404 });
}