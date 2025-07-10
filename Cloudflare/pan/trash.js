// trash.js
import { corsHeaders, verifyAuth, getConfig, jsonResponse } from './utils.js';

export async function handleTrashRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^trash\/+/, '');

  // 验证权限
  const auth = await verifyAuth(request, env);
  if (!auth.valid) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    switch (path) {
      case 'list':
        return handleTrashList(env, auth);
      case 'restore':
        return handleRestoreFile(request, env, auth);
      case 'clean':
        return handleCleanTrash(env, auth);
      default:
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('回收站操作错误:', error);
    return jsonResponse({ error: '服务器错误' }, 500);
  }
}

async function handleTrashList(env, auth) {
  const trashFiles = await env.BUCKET.list({ prefix: '__trash__/' });
  const now = Date.now();
  
  const files = trashFiles.objects.map(file => {
    const deleteTime = parseInt(file.customMetadata?.deleteTime || '0');
    const daysLeft = 7 - Math.floor((now - deleteTime) / (1000 * 60 * 60 * 24));
    
    return {
      name: file.key.replace(/^__trash__\//, ''),
      size: file.size,
      deleteTime: new Date(deleteTime).toISOString(),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      uploader: file.customMetadata?.uploader
    };
  });

  // 普通用户只能看到自己删除的文件
  const filteredFiles = auth.role === 'admin' 
    ? files 
    : files.filter(f => f.uploader === auth.key);

  return jsonResponse({ files: filteredFiles });
}

async function handleRestoreFile(request, env, auth) {
  const { fileKey } = await request.json();
  if (!fileKey) {
    return jsonResponse({ error: '缺少文件参数' }, 400);
  }

  const trashKey = `__trash__/${fileKey}`;
  const file = await env.BUCKET.get(trashKey);
  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404);
  }

  // 权限检查
  if (auth.role !== 'admin' && file.customMetadata?.uploader !== auth.key) {
    return jsonResponse({ error: '无权恢复此文件' }, 403);
  }

  const originalKey = file.customMetadata?.originalKey || fileKey;
  await env.BUCKET.put(originalKey, file.body, {
    httpMetadata: file.httpMetadata,
    customMetadata: file.customMetadata
  });
  await env.BUCKET.delete(trashKey);

  return jsonResponse({ success: true });
}

async function handleCleanTrash(env, auth) {
  if (auth.role !== 'admin') {
    return jsonResponse({ error: '需要管理员权限' }, 403);
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const trashFiles = await env.BUCKET.list({ prefix: '__trash__/' });

  for (const file of trashFiles.objects) {
    const deleteTime = parseInt(file.customMetadata?.deleteTime || '0');
    if (deleteTime < sevenDaysAgo) {
      await env.BUCKET.delete(file.key);
    }
  }

  return jsonResponse({ success: true });
}