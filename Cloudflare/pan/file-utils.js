// file-utils.js
export async function authenticate(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'Unauthorized', status: 401 };
    }

    const password = authHeader.slice(7);
    const config = await getConfig(env);
    
    if (config.blacklist?.includes(password)) {
        return { valid: false, error: 'Forbidden', status: 403 };
    }

    for (const [role, users] of Object.entries(config.accessKeys)) {
        const user = users.find(u => u.password === password);
        if (user) return { valid: true, role, key: password };
    }

    return { valid: false, error: 'Unauthorized', status: 401 };
}

export async function getConfig(env) {
    const configObj = await env.BUCKET.get('__config__/access.json');
    return JSON.parse(await configObj.text());
}

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};