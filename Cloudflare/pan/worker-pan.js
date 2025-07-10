// worker-pan.js
import { handleAuth } from './auth.js';
import { handleFileRequest } from './files.js';
import { handleTrashRequest } from './trash.js';
import { handleUserRequest } from './users.js';
import { handleShareRequest } from './sharing.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');
    
    try {
      // 路由分发
      if (path.startsWith('auth/')) {
        return handleAuth(request, env);
      }
      else if (path.startsWith('files/')) {
        return handleFileRequest(request, env);
      }
      else if (path.startsWith('trash/')) {
        return handleTrashRequest(request, env);
      }
      else if (path.startsWith('users/')) {
        return handleUserRequest(request, env);
      }
      else if (path.startsWith('share/')) {
        return handleShareRequest(request, env);
      }
      
      // 默认路由
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('请求处理错误:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};