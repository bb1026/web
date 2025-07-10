// files-main.js
import { authenticate, corsHeaders } from './file-utils.js';
import * as operations from './file-operations.js';
import * as folders from './folder-operations.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/+/, '');
        
        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 验证权限
        const auth = await authenticate(request, env);
        if (!auth.valid) {
            return new Response(auth.error, { 
                status: auth.status,
                headers: corsHeaders
            });
        }

        try {
            let result;
            const params = url.searchParams;
            
            switch(path) {
                case 'files/upload':
                    result = await operations.handleUpload(request, env, auth.role, auth.key);
                    break;
                case 'files/download':
                    result = await operations.handleDownload(env, params.get('key'), auth.role);
                    break;
                case 'files/delete':
                    result = await operations.handleDelete(env, params.get('key'), auth.role, auth.key);
                    break;
                case 'files/list':
                    result = await folders.handleListFiles(env, params.get('path'), auth.role, auth.key);
                    break;
                case 'files/mkdir':
                    result = await folders.handleMkdir(env, (await request.json()).path, auth.role, auth.key);
                    break;
                default:
                    return new Response('Not Found', { 
                        status: 404,
                        headers: corsHeaders
                    });
            }

            return new Response(JSON.stringify(result), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        } catch (error) {
            console.error('Error:', error);
            return new Response('Internal Server Error', { 
                status: 500,
                headers: corsHeaders
            });
        }
    }
};