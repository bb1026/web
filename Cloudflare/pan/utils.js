// utils.js
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// 验证权限
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: '未授权', status: 401 };
  }

  const password = authHeader.slice(7);
  const config = await getConfig(env);
  
  // 检查黑名单
  if (config.blacklist?.includes(password)) {
    return { valid: false, error: '该密码已被禁用', status: 403 };
  }

  // 查找用户权限
  for (const [role, users] of Object.entries(config.accessKeys)) {
    const user = users.find(u => u.password === password);
    if (user) return { valid: true, role, key: password };
  }

  return { valid: false, error: '无效密码', status: 401 };
}

// 获取配置
export async function getConfig(env) {
  try {
    const configObj = await env.BUCKET.get('__config__/access.json');
    return configObj ? JSON.parse(await configObj.text()) : { accessKeys: {}, blacklist: [] };
  } catch (e) {
    console.error('读取配置失败:', e);
    return { accessKeys: {}, blacklist: [] };
  }
}

// 保存配置
export async function saveConfig(config, env) {
  try {
    await env.BUCKET.put('__config__/access.json', JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('保存配置失败:', e);
    return false;
  }
}

// 生成响应
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}