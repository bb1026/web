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
      case 'blacklist/remove':
        return handleRemoveFromBlacklist(request, env);
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
  
  // 转换数据结构，直接返回密码作为键
  const users = {};
  for (const [role, userList] of Object.entries(config.accessKeys)) {
    userList.forEach(user => {
      users[user.password] = {
        role,
        remark: user.remark,
        createdAt: user.createdAt
      };
    });
  }

  return jsonResponse({
    users,
    blacklist: config.blacklist || []
  });
}

async function handleAddUser(request, env) {
  const { password, role, remark } = await request.json();
  
  // 参数验证
  if (!password || !role) {
    return jsonResponse({ error: '缺少必要参数' }, 400);
  }

  if (typeof password !== 'string' || password.length < 4) {
    return jsonResponse({ error: '密码至少需要4个字符' }, 400);
  }

  const config = await getConfig(env);
  
  // 检查密码是否已存在
  for (const userList of Object.values(config.accessKeys)) {
    if (userList.some(user => user.password === password)) {
      return jsonResponse({ error: '该密码已存在' }, 400);
    }
  }

  // 初始化对应角色的数组（如果不存在）
  if (!config.accessKeys[role]) {
    config.accessKeys[role] = [];
  }

  // 添加用户
  config.accessKeys[role].push({
    password,
    remark: remark || '',
    createdAt: new Date().toISOString()
  });

  await saveConfig(config, env);
  return jsonResponse({ success: true });
}

async function handleDeleteUser(request, env) {
  const { password } = await request.json();
  if (!password) {
    return jsonResponse({ error: '缺少密码参数' }, 400);
  }

  const config = await getConfig(env);
  let found = false;

  // 从所有角色中删除该密码的用户
  for (const role of Object.keys(config.accessKeys)) {
    config.accessKeys[role] = config.accessKeys[role].filter(
      user => user.password !== password
    );
    if (config.accessKeys[role].length === 0) {
      delete config.accessKeys[role];
    }
    found = found || config.accessKeys[role].some(user => user.password === password);
  }

  if (!found) {
    return jsonResponse({ error: '用户不存在' }, 404);
  }

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

async function handleRemoveFromBlacklist(request, env) {
  const { password } = await request.json();
  if (!password) {
    return jsonResponse({ error: '缺少密码参数' }, 400);
  }

  const config = await getConfig(env);
  if (config.blacklist) {
    config.blacklist = config.blacklist.filter(p => p !== password);
    await saveConfig(config, env);
  }

  return jsonResponse({ success: true });
}