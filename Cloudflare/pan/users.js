// users.js
import { corsHeaders, verifyAuth, getConfig, saveConfig, jsonResponse } from './utils.js';

export async function handleUserRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^users\/+/, '');

  // 验证管理员权限
  const auth = await verifyAuth(request, env);
  if (!auth.valid || auth.role !== 'admin') {
    return jsonResponse({ error: '需要管理员权限' }, 403);
  }

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    switch (path) {
      case 'list':
        return handleListUsers(env);
      case 'add':
        return handleAddUser(request, env);
      case 'delete':
        return handleDeleteUser(request, env);
      case 'blacklist/add':
        return handleAddToBlacklist(request, env);
      default:
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('用户管理错误:', error);
    return jsonResponse({ error: '服务器错误' }, 500);
  }
}

async function handleListUsers(env) {
  const config = await getConfig(env);
  return jsonResponse({
    users: config.accessKeys,
    blacklist: config.blacklist || []
  });
}

async function handleAddUser(request, env) {
  const { password, role, remark } = await request.json();
  if (!password || !role) {
    return jsonResponse({ error: '缺少必要参数' }, 400);
  }

  const config = await getConfig(env);
  const userId = `user_${Date.now()}`;
  
  config.accessKeys[userId] = {
    password,
    role,
    remark: remark || '',
    createdAt: new Date().toISOString()
  };

  await saveConfig(config, env);
  return jsonResponse({ success: true, userId });
}

async function handleDeleteUser(request, env) {
  const { userId } = await request.json();
  if (!userId) {
    return jsonResponse({ error: '缺少用户ID' }, 400);
  }

  const config = await getConfig(env);
  if (!config.accessKeys[userId]) {
    return jsonResponse({ error: '用户不存在' }, 404);
  }

  delete config.accessKeys[userId];
  await saveConfig(config, env);
  return jsonResponse({ success: true });
}

async function handleAddToBlacklist(request, env) {
  const { password } = await request.json();
  if (!password) {
    return jsonResponse({ error: '缺少密码参数' }, 400);
  }

  const config = await getConfig(env);
  if (!config.blacklist) config.blacklist = [];
  
  if (!config.blacklist.includes(password)) {
    config.blacklist.push(password);
    await saveConfig(config, env);
  }

  return jsonResponse({ success: true });
}
