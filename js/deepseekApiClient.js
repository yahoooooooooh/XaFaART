// js/deepseekApiClient.js

/**
 * DeepSeek API Client (兼容OpenAI API格式)
 * 负责与代理服务器进行通信，支持流式响应和非流式响应。
 */
class DeepseekApiClient {
    // --- 修改 constructor 开始 ---
    constructor(modelName, baseUrl) { // 删除了 apiKey 参数
        this.isConfigured = true;

        if (!modelName) {
            console.error("Deepseek Model Name is required.");
            this.isConfigured = false;
        }
        if (!baseUrl) {
            console.error("Deepseek Base URL is required.");
            this.isConfigured = false;
        }

        this.modelName = modelName;
        this.baseUrl = baseUrl; // 这个 baseUrl 现在是 '/api/proxy'

        this.isStreaming = false;
        this.currentController = null; // 用于中止请求
    }
    // --- 修改 constructor 结束 ---

    /**
     * 发起流式生成内容的请求
     * @param {Array<Object>} messages - 对话历史
     * @param {Function} onChunk - (chunkText: string) => void
     * @param {Function} onEnd - (finalTokenCount: number) => void
     * @param {Function} onError - (error: Error) => void
     * @param {Object} generationConfig - (可选) 生成参数配置
     * @param {number} timeoutMs - (可选) 请求超时时间 (毫秒)
     */
    async generateContentStream(
        messages,
        onChunk,
        onEnd,
        onError,
        generationConfig = {},
        timeoutMs = 60000
    ) {
        if (!this.isConfigured) {
            onError(new Error("Deepseek API Client is not configured properly."));
            return;
        }
        if (this.isStreaming && this.currentController) {
            console.warn("DeepseekApiClient: Stream already in progress. Aborting previous.");
            this.abortStream();
        }

        this.isStreaming = true;
        this.currentController = new AbortController();
        const signal = this.currentController.signal;

        const requestBody = {
            model: this.modelName,
            messages: messages,
            stream: true,
            temperature: generationConfig.temperature || 0.7,
            top_p: generationConfig.topP || 0.9,
            max_tokens: generationConfig.maxOutputTokens || 8192,
        };

        let finalTokenCount = 0;
        const timeoutId = setTimeout(() => {
            if (this.isStreaming) {
                console.warn(`DeepseekApiClient: Request timed out after ${timeoutMs / 1000}s. Aborting.`);
                this.currentController.abort();
            }
        }, timeoutMs);

        try {
            console.log("[DeepseekClient] Sending stream request to PROXY:", this.baseUrl, "Model:", this.modelName);
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // --- 修改开始 ---
                    // 'Authorization' header 已被移除，由服务器代理添加
                    // --- 修改结束 ---
                },
                body: JSON.stringify(requestBody),
                signal: signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: { message: `HTTP error! status: ${response.status} ${response.status.text}` } };
                }
                console.error("Deepseek API Error (via Proxy):", response.status, errorData);
                throw new Error(errorData?.error?.message || `Proxy request failed with status ${response.status}`);
            }

            if (!response.body) {
                throw new Error("Response body is null. Streaming not possible.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            // eslint-disable-next-line no-constant-condition
            while (true) {
                if (!this.isStreaming) {
                    console.log("DeepseekApiClient: Stream externally aborted during read loop.");
                    if (!reader.closed) reader.cancel("Stream externally aborted").catch(e => console.warn("Error cancelling reader:", e));
                    break;
                }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const chunk = buffer.substring(0, boundary);
                    buffer = buffer.substring(boundary + 2);

                    if (chunk.startsWith('data:')) {
                        const jsonStr = chunk.substring(5).trim();
                        if (jsonStr === '[DONE]') {
                            boundary = -1;
                            break;
                        }
                        try {
                            const parsedData = JSON.parse(jsonStr);
                            if (parsedData.choices && parsedData.choices.length > 0) {
                                const delta = parsedData.choices[0].delta;
                                if (delta && delta.content) {
                                    onChunk(delta.content);
                                }
                                if (parsedData.usage && typeof parsedData.usage.total_tokens === 'number') {
                                    finalTokenCount = parsedData.usage.total_tokens;
                                }
                            }
                            if (parsedData.error) {
                                console.warn("DeepseekApiClient: Error object in stream data:", parsedData.error);
                            }
                        } catch (e) {
                            console.warn("DeepseekApiClient: Error parsing JSON chunk from stream:", e, "Chunk:", jsonStr.substring(0, 100) + "...");
                        }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }
            console.log("[DeepseekClient] Stream ended. Final Token Count:", finalTokenCount);

            if (this.isStreaming) {
                onEnd(finalTokenCount);
            }

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.log("DeepseekApiClient: Stream fetch aborted (by timeout or external).");
                if (this.isStreaming) {
                    onError(new Error("请求超时或被中止。"));
                }
            } else {
                console.error("DeepseekApiClient: Error in generateContentStream:", error);
                onError(error);
            }
        } finally {
            this.isStreaming = false;
            this.currentController = null;
        }
    }

    /**
     * 发起非流式生成内容的请求
     * @param {Array<Object>} messages - 对话历史
     * @param {Object} generationConfig - (可选) 生成参数配置
     * @returns {Promise<{text: string, tokenCount: number}>} - 包含生成的文本和token数
     */
    async generateContent(messages, generationConfig = {}) {
        if (!this.isConfigured) {
            throw new Error("Deepseek API Client is not configured properly.");
        }
        if (this.isStreaming) {
            console.warn("DeepseekApiClient: Streaming in progress. Abort first.");
            throw new Error("Streaming in progress. Abort first.");
        }

        const requestBody = {
            model: this.modelName,
            messages: messages,
            stream: false,
            temperature: generationConfig.temperature || 0.7,
            top_p: generationConfig.topP || 0.9,
            max_tokens: generationConfig.maxOutputTokens || 8192,
        };

        let finalTokenCount = 0;
        let responseData = null;

        try {
            console.log("[DeepseekClient] Sending non-stream request to PROXY:", this.baseUrl, "Model:", this.modelName);
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // --- 修改开始 ---
                    // 'Authorization' header 已被移除，由服务器代理添加
                    // --- 修改结束 ---
                },
                body: JSON.stringify(requestBody),
            });

            responseData = await response.json();

            if (responseData.usage && typeof responseData.usage.total_tokens === 'number') {
                finalTokenCount = responseData.usage.total_tokens;
            }
            console.log("[DeepseekClient] Non-stream response. Token Count:", finalTokenCount);

            if (!response.ok || responseData.error) {
                console.error("Deepseek API Error (via Proxy):", response.status, responseData);
                throw new Error(responseData?.error?.message || `Proxy request failed with status ${response.status}`);
            }

            if (responseData.choices && responseData.choices.length > 0) {
                const text = responseData.choices[0].message.content;
                return { text, tokenCount: finalTokenCount };
            }
            return { text: "", tokenCount: finalTokenCount };

        } catch (error) {
            console.error("DeepseekApiClient: Error in generateContent (non-streaming):", error);
            if (responseData?.usage?.total_tokens) {
                finalTokenCount = responseData.usage.total_tokens;
            }
            throw error;
        }
    }

    /**
     * 中止当前正在进行的流式请求
     */
    abortStream() {
        if (this.isStreaming && this.currentController) {
            console.log("DeepseekApiClient: Aborting current stream externally...");
            this.currentController.abort();
            this.isStreaming = false;
            this.currentController = null;
        }
    }
}