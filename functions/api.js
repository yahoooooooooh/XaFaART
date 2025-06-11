// 文件: /functions/api.js

/**
 * Cloudflare Pages 函数，智能代理所有到 /api/* 的请求
 * @param {object} context - 包含 request, env, next 等信息的上下文对象
 */
export async function onRequest(context) {
  // 从上下文中解构出 request, env
  const { request, env } = context;

  // --- START OF FIX: 处理 CORS 预检请求 ---
  // 当浏览器发送非简单请求（如带有 'Content-Type: application/json' 的 POST）时，
  // 会先发送一个 OPTIONS 方法的预检请求来询问服务器是否允许。
  // 我们需要正确响应这个 OPTIONS 请求，否则浏览器会阻止真正的 POST 请求。
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // 204 No Content 是对预检请求的标准响应
      headers: {
        // 允许所有来源的请求。在生产环境中，你可能希望限制为你的网站域名。
        'Access-Control-Allow-Origin': '*', 
        // 允许的请求方法
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        // 允许的请求头
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // 预检请求结果的缓存时间（秒）
        'Access-Control-Max-Age': '86400', 
      },
    });
  }
  // --- END OF FIX ---
  
  // 检查请求方法 (现在只检查非OPTIONS的请求)
  if (request.method !== 'POST') {
    return new Response(`Method ${request.method} Not Allowed`, { status: 405 });
  }

  // 从环境变量中安全地读取 API 密钥
  const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    return new Response('API key is not configured on the server.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  // 动态构建目标 URL
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const deepseekApiUrl = `https://api.deepseek.com/v1${path}`;

  try {
    const response = await fetch(deepseekApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: request.body,
      // 对于流式响应，需要 duplex: 'half'
      // Cloudflare Workers 运行时需要这个
      duplex: 'half', 
    });

    // 确保将目标API的响应头（特别是CORS相关的）也传递回浏览器
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*'); // 再次确认允许来源

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (e) {
    let errorMessage = 'Error proxying the request.';
    if (e instanceof Error) {
        errorMessage = e.message;
    }
    console.error(`Proxy error for ${deepseekApiUrl}:`, e);
    return new Response(errorMessage, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}