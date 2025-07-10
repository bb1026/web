// users.js
export async function handleUserRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^users\/+/, '');

  // 验证管理员权限
  const auth = await verifyAuth(request, env);
  if (!auth.valid || auth.role !== 'admin') {
    return new Response('需要管理员权限', {
      status: 403,
      headers: corsHeaders
    });
  }

  switch (path) {
    case 'list':
      return handleListUsers(env, corsHeaders);
    case 'add':
      return handleAddUser(request, env, corsHeaders);
    case 'update':
      return handleUpdateUser(request, env, corsHeaders);
    case 'delete':
      return handleDeleteUser(request, env, corsHeaders);
    case 'blacklist/add':
      return handleAddToBlacklist(request, env, corsHeaders);
    case 'blacklist/remove':
      return handleRemoveFromBlacklist(request, env, corsHeaders);
    default:
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });
  }
}

// 各用户管理函数的实现...
// (包含用户列表、添加、更新、删除、黑名单管理等实现)
