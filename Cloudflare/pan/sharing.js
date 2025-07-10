// sharing.js
import { corsHeaders, verifyAuth, getConfig, saveConfig, jsonResponse } from './utils.js';

export async function handleShareRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^share\/+/, '');

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
      case 'create':
        return handleCreateShare(request, env, auth);
      case 'list':
        return handleListShares(env, auth);
      case 'cancel':
        return handleCancelShare(request, env, auth);
      default:
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('分享操作错误:', error);
    return jsonResponse({ error: '服务器错误' }, 500);
  }
}

async function handleCreateShare(request, env, auth) {
  const { fileKey, expireDays = 7, password = '' } = await request.json();
  
  // 验证文件存在
  const file = await env.BUCKET.get(fileKey);
  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404);
  }

  // 权限检查
  if (auth.role !== 'admin' && file.customMetadata?.uploader !== auth.key) {
    return jsonResponse({ error: '无权分享此文件' }, 403);
  }

  // 生成分享ID
  const shareId = crypto.randomUUID();
  const now = Date.now();
  const expireAt = expireDays > 0 ? now + expireDays * 86400000 : 0;

  // 保存分享记录
  const config = await getConfig(env);
  if (!config.shares) config.shares = {};
  
  config.shares[shareId] = {
    fileKey,
    createdAt: now,
    expireAt,
    password: password || null,
    creator: auth.key
  };

  await saveConfig(config, env);

  return jsonResponse({
    shareId,
    shareUrl: `/share/${shareId}`,
    expireAt: expireAt > 0 ? new Date(expireAt).toISOString() : '永久'
  });
}

async function handleListShares(env, auth) {
  const config = await getConfig(env);
  if (!config.shares) return jsonResponse({ shares: [] });

  const now = Date.now();
  const shares = Object.entries(config.shares)
    .filter(([_, share]) => share.creator === auth.key || auth.role === 'admin')
    .map(([shareId, share]) => ({
      shareId,
      fileKey: share.fileKey,
      createdAt: new Date(share.createdAt).toISOString(),
      expireAt: share.expireAt > 0 ? new Date(share.expireAt).toISOString() : '永久',
      hasPassword: !!share.password
    }));

  return jsonResponse({ shares });
}

async function handleCancelShare(request, env, auth) {
  const { shareId } = await request.json();
  if (!shareId) {
    return jsonResponse({ error: '缺少分享ID' }, 400);
  }

  const config = await getConfig(env);
  if (!config.shares || !config.shares[shareId]) {
    return jsonResponse({ error: '分享不存在' }, 404);
  }

  // 权限检查
  if (auth.role !== 'admin' && config.shares[shareId].creator !== auth.key) {
    return jsonResponse({ error: '无权取消此分享' }, 403);
  }

  delete config.shares[shareId];
  await saveConfig(config, env);
  return jsonResponse({ success: true });
}