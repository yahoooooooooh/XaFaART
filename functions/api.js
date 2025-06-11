// 文件: /functions/api.js

/**
 * Cloudflare Pages 函数，智能代理所有到 /api/* 的请求
 * @param {object} context - 包含 request, env, next 等信息的上下文对象
 */
export async function onRequest(context) {
  // 从上下文中解构出 request, env
  const { request, env } = context;
  
  // 检查请求方法
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
  
  // ★★★ 核心修改：动态构建目标 URL ★★★
  // 1. 获取请求的 URL
  const url = new URL(request.url);
  // 2. 截取掉我们自己的域名部分，只保留路径，例如 /api/chat/completions
  //    我们去掉开头的 /api，只留下 /chat/completions
  const path = url.pathname.replace(/^\/api/, '');
  // 3. 将剩余的路径拼接到 DeepSeek 的基础 URL 后面
  const deepseekApiUrl = `https://api.deepseek.com/v1${path}`;


  try {
    const response = await fetch(deepseekApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: request.body,
      duplex: 'half',
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
      },
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