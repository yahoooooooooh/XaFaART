// js/ai-duel-manager.js

class AIDuelManager {
    constructor() {
        this.duelQuestions = [];
        this.aiAnswers = [];
        this.isAIResponding = false;
        this.aiResponsePromise = null;
        this.initialized = false;
        
        this.apiClient = null; 
    }

    /**
     * MODIFIED: Public init method called by App.js after AppConfig is ready.
     */
    init() {
        if (this.initialized) {
            console.warn("AIDuelManager: Already initialized.");
            return;
        }
        this._loadAIConfigAndClient();
        this.initialized = true;
        console.log("✅ AIDuelManager initialized.");
    }
    
    /**
     * MODIFIED: Internal method to load AI config and create the API client.
     */
    _loadAIConfigAndClient() {
        const aiConfig = window.AppConfig?.APP_CONFIG?.ai;
        if (aiConfig && aiConfig.model && aiConfig.baseUrl) {
            // --- 修改开始 ---
            this.apiClient = new DeepseekApiClient(aiConfig.model, aiConfig.baseUrl); // 移除了 aiConfig.key
            // --- 修改结束 ---
            if (!this.apiClient.isConfigured) {
                 console.error("AIDuelManager: API Client failed to configure. Check config.js for valid settings.");
                 if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast("AI对决功能因配置错误无法启动。", "error", 7000);
                }
            }
        } else {
            console.error("AIDuelManager: AI Config not found or incomplete. AI Duel features will not work.");
        }
    }

    startDuel(questions) {
        if (!this.initialized) {
            this._loadAIConfigAndClient();
            this.initialized = true;
        }

        if (!this.apiClient || !this.apiClient.isConfigured) {
            console.error("AIDuelManager: Cannot start duel. API client is not configured.");
            return Promise.reject(new Error("AI对决服务未正确配置。"));
        }

        if (!questions || questions.length === 0) {
            console.error("AIDuelManager: No questions provided for AI duel.");
            return Promise.reject(new Error("没有提供用于AI对决的题目。"));
        }
        
        this.duelQuestions = questions;
        this.aiAnswers = new Array(questions.length).fill(null);
        this.isAIResponding = true;
        
        this.aiResponsePromise = this._fetchAIAnswers(questions);
        return this.aiResponsePromise;
    }

    async _fetchAIAnswers(questions) {
        const prompt = this._buildAIPromptForDuel(questions);
        const conversationHistory = [{ role: "user", content: prompt }];
        
        try {
            console.log("[AI Duel] Sending non-stream request via apiClient...");
            const response = await this.apiClient.generateContent(conversationHistory, {
                temperature: 0.5,
            });

            window.apiMetricsManager?.incrementCall(response.tokenCount || 0);
            
            console.log("[AI Duel] AI Raw Response Text:", response.text);
            this.aiAnswers = this._parseAIAnswers(response.text, questions.length);

        } catch (error) {
            console.error("[AI Duel] Error in _fetchAIAnswers:", error);
            let specificErrorMsg = error.message || "AI请求失败或处理响应出错";
            this.aiAnswers = new Array(questions.length).fill({ error: specificErrorMsg });
        } finally {
            this.isAIResponding = false;
            console.log("[AI Duel] AI answers processed:", this.aiAnswers);
        }
        return this.aiAnswers;
    }

    _buildAIPromptForDuel(questions) {
        let prompt = `请为以下 ${questions.length} 道选择题选择你认为正确的答案。\n`;
        prompt += `对于单选题，请返回正确选项的索引号 (A为0, B为1, C为2, D为3, ...)。\n`;
        prompt += `对于多选题，请返回一个包含所有正确选项索引号的数组 (例如 [0, 2])。\n`;
        prompt += `请严格按照题目序号返回答案，JSON格式如下：\n`;
        prompt += `{\n  "answers": [\n    { "question_index": 0, "selected_option_index": 0 },\n`;
        prompt += `    { "question_index": 1, "selected_option_indices": [1, 3] },\n`;
        prompt += `    // ... 更多题目，确保为每个题目提供一个答案对象\n  ]\n}\n\n`;
        prompt += "题目列表：\n\n";

        questions.forEach((q, index) => {
            const questionType = Array.isArray(q.correctAnswers) ? "多选" : "单选";
            prompt += `${index + 1}. 题干: ${q.question}\n`;
            prompt += `   选项:\n`;
            q.options.forEach((opt, i) => {
                prompt += `     ${String.fromCharCode(65 + i)}. ${opt}\n`;
            });
            prompt += `   类型: ${questionType}\n\n`;
        });
        return prompt;
    }

    _parseAIAnswers(responseText, expectedCount) {
        try {
            let jsonString = responseText;
            if (responseText.startsWith("```json")) {
                jsonString = responseText.substring(7, responseText.lastIndexOf("```")).trim();
            } else if (responseText.startsWith("```")) {
                 jsonString = responseText.substring(3, responseText.lastIndexOf("```")).trim();
            }

            const parsed = JSON.parse(jsonString);
            if (parsed && Array.isArray(parsed.answers) && parsed.answers.length === expectedCount) {
                const results = new Array(expectedCount).fill(null);
                parsed.answers.forEach(ans => {
                    if (ans.question_index !== undefined && (ans.selected_option_index !== undefined || ans.selected_option_indices !== undefined)) {
                        results[ans.question_index] = ans.selected_option_index !== undefined ? ans.selected_option_index : ans.selected_option_indices;
                    } else {
                        results[ans.question_index] = { error: "AI返回格式不符" };
                        console.warn(`AI答案格式问题 (题目 ${ans.question_index}):`, ans);
                    }
                });
                
                if (results.some(r => r === null)) {
                    console.warn("[AI Duel] 部分AI答案未能正确解析或缺失，用错误标记填充:", results);
                     return results.map(r => r === null ? { error: "AI未回答此题" } : r);
                }
                return results;
            } else {
                console.error("[AI Duel] AI parsed answers array length mismatch or 'answers' array missing. Expected:", expectedCount, "Got:", parsed.answers ? parsed.answers.length : 'undefined array', "Parsed:", parsed);
                 return new Array(expectedCount).fill({ error: "AI返回数量不符" });
            }
        } catch (error) {
            console.error("[AI Duel] Error parsing AI response JSON:", error, "Response Text:", responseText);
            return new Array(expectedCount).fill({ error: "AI响应解析失败" });
        }
    }

    getAIAnswers() {
        return this.aiAnswers;
    }

    isAIReady() {
        return !this.isAIResponding && this.aiAnswers.length === this.duelQuestions.length && !this.aiAnswers.some(ans => ans === null);
    }

    reset() {
        this.duelQuestions = [];
        this.aiAnswers = [];
        this.isAIResponding = false;
        this.aiResponsePromise = null;
    }
}

window.aiDuelManager = new AIDuelManager();