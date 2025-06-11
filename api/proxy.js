// 文件: /api/proxy.js

/**
 * Cloudflare Pages 函数，只处理 POST 请求
 * @param {object} context - 包含 request, env, 等信息的上下文对象
 */
export async function onRequestPost(context) {
    // 从上下文中解构出 request 和 env
    const { request, env } = context;
  
    // 因为函数名是 onRequestPost，Cloudflare 自动保证了这只会处理 POST 请求
    // 所以我们不再需要 if (request.method !== 'POST') 的检查了
  
    // 从环境变量中安全地读取 API 密钥
    const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
  
    if (!DEEPSEEK_API_KEY) {
      return new Response('API key is not configured on the server.', { status: 500 });
    }
  
    const deepseekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    try {
      const requestBody = await request.json();
  
      const response = await fetch(deepseekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });
  
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type'),
        },
      });
  
    } catch (e) {
      console.error('Proxy error:', e);
      return new Response('Error proxying the request.', { status: 500 });
    }
  }