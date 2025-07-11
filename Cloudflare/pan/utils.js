export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export function corsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// 新版 access.json 密码解析：返回 { role, remark }
export function detectRoleFromPassword(accessMap, inputPwd) {
  for (const [role, users] of Object.entries(accessMap)) {
    for (const user of users) {
      if (user.password === inputPwd) {
        return { role, remark: user.remark || '' };
      }
    }
  }
  return { role: '', remark: '' };
}