import { jsonResponse } from './utils.js';

export async function handleFileOps(path, request, env, key, role, accessMap) {
  const url = new URL(request.url);

  // 文件列表
  if (path === 'list' && role) {
    const list = await env.BUCKET.list({ include: ['customMetadata'] });
    const visible = list.objects.filter(o =>
      o.customMetadata?.visible !== 'false' &&
      !o.key.startsWith('__config__/') &&
      !o.key.startsWith('__trash__/') &&
      !o.key.startsWith('__share__/')
    );
    return jsonResponse(visible.map(f => ({
      name: f.key,
      uploader: f.customMetadata?.uploader || 'system',
      size: f.size
    })));
  }

  // 下载
  if (path === 'download' && role) {
    const fileName = url.searchParams.get('file');
    const file = await env.BUCKET.get(fileName);
    if (!file) return new Response('文件不存在', { status: 404 });
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName.split('/').pop())}"`
      }
    });
  }

  // 上传
  if (path === 'upload' && (role === 'admin' || role === 'upload')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!file) return new Response('未找到文件', { status: 400 });
    await env.BUCKET.put(file.name, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { uploader: key, visible: 'true' }
    });
    return new Response('✅ 上传成功', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 删除
  if (path === 'delete' && (role === 'admin' || role === 'upload')) {
    const fileName = url.searchParams.get('file');
    const file = await env.BUCKET.get(fileName, { include: ['customMetadata'] });
    if (!file) return new Response('文件不存在', { status: 404 });
    if (role === 'upload' && file.customMetadata?.uploader !== key)
      return new Response('❌ 无权删除', { status: 403 });

    const ts = Date.now();
    await env.BUCKET.put(`__trash__/${fileName}__${ts}`, file.body, {
      customMetadata: { ...file.customMetadata, deletedAt: ts.toString() }
    });
    await env.BUCKET.delete(fileName);
    return new Response('✅ 已移入回收站', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 新建文件夹
  if (path === 'mkdir' && (role === 'admin' || role === 'upload')) {
    const contentType = request.headers.get('Content-Type') || '';
    let name = '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      name = body.name?.trim();
    } else {
      name = (await request.text()).trim();
    }

    if (!name) return new Response('❌ 名称不能为空', { status: 400 });
    if (!name.endsWith('/')) name += '/';

    await env.BUCKET.put(name, '', {
      customMetadata: { uploader: key, visible: 'true' }
    });

    return new Response(`✅ 已添加文件夹：${name}`, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 移动文件
  if (path === 'move' && (role === 'admin' || role === 'upload') && request.method === 'POST') {
    const { items, target, key: requestKey } = await request.json();
    if (!Array.isArray(items) || !target || accessMap[requestKey] !== role)
      return new Response('❌ 参数错误或权限验证失败', { status: 400 });

    for (const oldKey of items) {
      const obj = await env.BUCKET.get(oldKey, { include: ['customMetadata'] });
      if (!obj) continue;
      if (role === 'upload' && obj.customMetadata?.uploader !== requestKey) continue;

      const fileName = oldKey.split('/').pop();
      const newKey = `${target.replace(/\/+$/, '')}/${fileName}`;
      await env.BUCKET.put(newKey, obj.body, {
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata
      });
      await env.BUCKET.delete(oldKey);
    }

    return new Response('✅ 移动成功', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response('❌ 未知文件操作', { status: 404 });
}