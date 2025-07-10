// utils.js
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: '未授权', status: 401 };
  }

  const token = authHeader.slice(7);
  // 验证token逻辑...
}

export async function getConfig(env) {
  const config = await env.BUCKET.get('__config__/access.json');
  return JSON.parse(await config.text());
}

export async function saveConfig(config, env) {
  await env.BUCKET.put('__config__/access.json', JSON.stringify(config));
}
