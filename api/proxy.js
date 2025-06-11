// 文件: /api/proxy.js

/**
 * Cloudflare Pages 函数，处理所有请求方法
 * @param {object} context - 包含 request, env, 等信息的上下文对象
 */
export async function onRequest(context) {
    // 从上下文中解构出 request 和 env
    const { request, env } = context;
  
    // 只允许 POST 请求，其他方法返回 405
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
  
    // 从环境变量中安全地读取 API 密钥
    // env 对象包含了您在 Cloudflare UI 中设置的所有环境变量
    const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
  
    if (!DEEPSEEK_API_KEY) {
      return new Response('API key is not configured on the server.', { status: 500 });
    }
  
    const deepseekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    try {
      // 获取前端发送过来的请求体
      const requestBody = await request.json();
  
      // 从我们的服务器向 DeepSeek API 发起真正的请求
      const response = await fetch(deepseekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, // 在服务器端安全地添加密钥
        },
        body: JSON.stringify(requestBody), // 将前端的请求体转发过去
      });
  
      // 将 DeepSeek 返回的流式或非流式响应直接传回给前端
      // 注意：这里我们不能直接返回 response，需要创建一个新的 Response 对象来传递流
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type'), // 保持原始的Content-Type
        },
      });
  
    } catch (e) {
      console.error('Proxy error:', e);
      return new Response('Error proxying the request.', { status: 500 });
    }
  }