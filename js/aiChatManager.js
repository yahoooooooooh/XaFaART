// js/aiChatManager.js

/**
 * AI 聊天管理器 (AI Chat Manager)
 * 负责管理与AI的所有类型对话：通用、学情诊断、题目提示、题目解析、平行时空反馈。
 * 提供多轮对话支持。
 * MODIFIED FOR DEEPSEEK API
 */
class AiChatManager {
    constructor() {
        this.uiUpdateCallbacks = null;
        this.studyReportProvider = null;

        this.deepseekClient = null;
        this.currentChatId = null;
        this.currentConversationHistory = [];
        this.isWaitingForAIResponse = false;
        this.currentMode = 'general';
        this.currentQuestionContext = null;
        this.currentEssayQuestionContext = null;
        this.isFirstUserMessageInMode = true;

        this.systemPrompts = {
            general: `你是一个乐于助人的AI学习助手，旨在以友好且信息量充足的方式回答用户关于艺术史、世界常识、英语学习等相关问题。如果问题超出你的知识范围，请礼貌地说明。`,
            diagnose: `你是一位专业的学习伙伴。你的任务是基于用户提供的学习数据报告（JSON格式）和用户的提问，进行深入分析，并提供个性化的学习反馈和建议。请使用友好、鼓励且专业的语气与用户交流。在分析数据时，请尽量具体，并结合数据中的指标进行说明。如果用户提供的JSON数据报告有无法解析的部分或不理解的字段，请礼貌地指出并请求用户澄清，或者在你能理解的范围内进行分析。你的回答应专注于帮助用户理解他们的学习状况并提供改进建议。`,
            hint: `你是一位循循诱导的辅导老师。请根据用户提供的【选择题】题目，旁敲侧击地给出启发性提示。提示应该聚焦到题目最核心的知识点或逻辑，且语言精练，长度控制在500个汉字左右。不要直接给出答案或解析。如果用户提供的信息不足以判断题目类型或内容，请礼貌地请求更多信息。`,
            explain: `你是一位专业的授课老师。请结合用户提供的【选择题】题目信息、原始解析和回答结果，提供深度且全面的解析。你的解析需要包含：
## 🎯 正确答案解析
详细解释为什么选择这个答案，包含相关的理论知识和背景信息。你需要使用准确清晰的语言写这部分，目的在于界定。
## ❌ 错误选项分析
逐一分析其他选项的问题所在，解释为什么它们不正确。（当且仅当涉及到英语语法的时候，你必须使用英语基础差的人也能理解你的解析，此时，你需要使用浅显易懂的语言来讲述，目的在于帮助用户理解）
## 💡 知识拓展
提供相关的延伸知识点，帮助更深入理解这个主题。
## 📚 学习建议
给出针对性的学习建议或记忆技巧。
如果内容不属于英语学习，请确保内容专业准确、结构清晰、语言生动。如果内容属于英语学习，必须生动形象、易于理解。`,
            essay_feedback: `你是一位博学而富有洞察力的艺术史比较研究专家。你的任务是基于用户当前正在学习的【一个特定艺术时期或主题】，进行横向的、全球范围内的知识扩展。

你会收到以下信息：
1.  用户当前学习的主题（例如，一个题目、一个时期名称或一件作品）。

你的任务是：
-   首先，简要确认用户当前学习的主题，例如“好的，我们来聊聊当xx时期在xx地区发展时，世界其他地方的艺术动态。”
-   然后，以清晰、生动、有条理的方式，介绍与用户主题【同一历史时期】，在【世界其他不同文明或地区】（例如，欧洲、中东、印度、美洲等）发生的重要的、有代表性的艺术事件、风格流派、代表人物或杰出作品。
-   你的回答应着重于建立“平行时空”的联系，帮助用户理解全球艺术的共时性与差异性。
-   你可以采用列表、小标题或段落的形式来组织内容，确保结构清晰。
-   如果用户提供的主题信息不足，请礼貌地请求更多细节，例如“为了更好地为您进行横向扩展，您能告诉我您具体在看哪个时期的哪个知识点吗？”
-   你的回答应具有启发性，激发用户对全球艺术史的兴趣。请使用引人入胜的语言，而不是干巴巴地罗列事实。`
        };
        this.initialized = false;
        console.log("AiChatManager constructor called.");
    }

    init(uiUpdateCallbacks, studyReportProvider) {
        if (this.initialized) {
            console.warn("AiChatManager already initialized.");
            return;
        }
        this.uiUpdateCallbacks = uiUpdateCallbacks;
        this.studyReportProvider = studyReportProvider;

        const aiConfig = window.AppConfig?.APP_CONFIG?.ai;
        if (!aiConfig || !aiConfig.model || !aiConfig.baseUrl) {
            console.error("AiChatManager: AI configuration is missing or incomplete! AI features will not work.");
            this.deepseekClient = null;
            if (this.uiUpdateCallbacks && this.uiUpdateCallbacks.displayMessage) {
                this.uiUpdateCallbacks.displayMessage("system", "AI助手功能配置错误，无法启动。", false, false, true, false);
            }
        } else {
            // --- 修改开始 ---
            this.deepseekClient = new DeepseekApiClient(aiConfig.model, aiConfig.baseUrl); // 移除了 aiConfig.key
            // --- 修改结束 ---
            if (!this.deepseekClient.isConfigured) {
                 if (this.uiUpdateCallbacks && this.uiUpdateCallbacks.displayMessage) {
                    this.uiUpdateCallbacks.displayMessage("system", "AI助手API Key未配置或无效，请在 config.js 中设置。", false, false, true, false);
                }
            } else {
                 if (!this.currentChatId) {
                    this.startNewChat();
                } else {
                    this.uiUpdateCallbacks.setLoadingState(this.isWaitingForAIResponse);
                    this.uiUpdateCallbacks.setModeButtonActive(this.currentMode);
                    this.uiUpdateCallbacks.displayMessage("system", "AI助手已就绪。", false, false, true, false);
                }
            }
        }
        this.initialized = true;
        console.log("AiChatManager initialized.");
    }

    focusInput() {
        const inputElement = document.getElementById('aiChatInput');
        if (inputElement) {
            inputElement.focus();
        }
    }
    
    preparePrompt(mode, data = null) {
        if (!this.uiUpdateCallbacks) {
            console.error("AiChatManager: UI Callbacks not set. Cannot prepare prompt.");
            return;
        }
        if (this.isWaitingForAIResponse) {
            this.uiUpdateCallbacks.displayMessage("system", "AI正在思考中，请等待当前响应完成后再切换模式。", false, false, true, false);
            return;
        }

        this.currentMode = mode;
        this.isFirstUserMessageInMode = true;
        this.uiUpdateCallbacks.setModeButtonActive(mode);

        let initialPromptText = "";
        let welcomeMessage = "";
        let shouldClearChat = true;
        let disableInput = false;

        if (mode !== 'hint' && mode !== 'explain') this.currentQuestionContext = null;
        if (mode !== 'essay_feedback') this.currentEssayQuestionContext = null;

        switch (mode) {
            case 'general':
                welcomeMessage = "你好！我是你的AI助手。有什么我可以帮助你的吗？";
                break;
            case 'diagnose':
                welcomeMessage = "你好！我是你的AI学情诊断师。请告诉我你希望分析什么，或者直接发送你的学习报告。";
                initialPromptText = "请帮我分析一下我的学习报告。";
                break;
            case 'hint':
                this.currentQuestionContext = data;
                if (!this.currentQuestionContext) {
                    welcomeMessage = "请在选择题目界面点击'💡 选择题提示'按钮来获取提示。";
                    disableInput = true;
                } else {
                    welcomeMessage = `已获取选择题信息："${this.currentQuestionContext.question.substring(0,50)}..."。\n请问您希望获得哪方面的提示？或者直接发送获取通用提示。`;
                    initialPromptText = `请给我这道选择题一个提示。`;
                }
                shouldClearChat = false;
                break;
            case 'explain':
                this.currentQuestionContext = data;
                if (!this.currentQuestionContext) {
                    welcomeMessage = "请在选择题目界面点击'📝 选择题解析'按钮来获取解析。";
                    disableInput = true;
                } else {
                    welcomeMessage = `已获取选择题信息："${this.currentQuestionContext.question.substring(0,50)}..."。\n请问您希望获得哪方面的解析？或者直接发送获取完整解析。`;
                    initialPromptText = `请详细解析这道选择题。`;
                }
                shouldClearChat = false;
                break;
            case 'essay_feedback':
                if (data) {
                    this.setCurrentEssayQuestionContext(data, false);
                     welcomeMessage = `当前平行时空题目："${this.currentEssayQuestionContext.question.substring(0, 70)}${this.currentEssayQuestionContext.question.length > 70 ? '...' : ''}"。\n请在下方输入你的回答。`;
                } else if (this.currentEssayQuestionContext) {
                    welcomeMessage = `继续就题目："${this.currentEssayQuestionContext.question.substring(0,70)}..."进行回答或提问。`;
                } else {
                    welcomeMessage = "你好！这里是平行时空题目的作答与反馈模式。请先从主学习区进入一个平行时空的题目，我才能为你提供反馈。";
                    disableInput = true;
                }
                shouldClearChat = false;
                break;
        }

        if (shouldClearChat) {
            this.uiUpdateCallbacks.clearChat();
            this.currentConversationHistory = [];
        }

        this.uiUpdateCallbacks.displayMessage("assistant", welcomeMessage, false, false, true, false);
        this.uiUpdateCallbacks.setInputText(initialPromptText);
        if (this.uiUpdateCallbacks.setInputDisabled) {
            this.uiUpdateCallbacks.setInputDisabled(disableInput);
        }

        console.log(`AiChatManager: Switched to mode "${mode}". Context:`, data || this.currentQuestionContext || this.currentEssayQuestionContext);
        if (!disableInput) this.focusInput();
    }

    startNewChat() {
        if (this.isWaitingForAIResponse) {
            this.uiUpdateCallbacks.displayMessage("system", "AI正在思考中，请等待当前响应完成后再开始新对话。", false, false, true, false);
            return;
        }
        this.currentChatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        this.currentConversationHistory = [];
        this.currentQuestionContext = null;
        this.currentEssayQuestionContext = null;
        this.isFirstUserMessageInMode = true;
        this.currentMode = 'general';

        this.uiUpdateCallbacks.clearChat();
        this.uiUpdateCallbacks.setModeButtonActive(this.currentMode);
        this.uiUpdateCallbacks.setInputText("");
        this.uiUpdateCallbacks.displayMessage("assistant", "你好！我是你的AI助手。有什么我可以帮助你的吗？", false, false, true, false);
        if (this.uiUpdateCallbacks.setInputDisabled) {
            this.uiUpdateCallbacks.setInputDisabled(false);
        }
        this.focusInput();
        console.log(`New chat started with ID: ${this.currentChatId}. Mode: ${this.currentMode}`);
    }

    setCurrentEssayQuestionContext(questionData, displayInitialMessage = true) {
        this.currentEssayQuestionContext = {
            question: questionData.question,
            modelAnswer: questionData.modelAnswer,
            explanation: questionData.explanation
        };
        this.currentMode = 'essay_feedback';
        this.isFirstUserMessageInMode = true;
        this.uiUpdateCallbacks.setModeButtonActive(this.currentMode);
        if (displayInitialMessage) {
            const welcomeMessage = `当前平行时空题目："${this.currentEssayQuestionContext.question.substring(0, 70)}${this.currentEssayQuestionContext.question.length > 70 ? '...' : ''}"。\n请在下方输入你的回答。`;
            const chatDisplay = document.getElementById('aiChatDisplay');
            if (chatDisplay && chatDisplay.lastElementChild) {
                const lastMsgText = chatDisplay.lastElementChild.querySelector('.message-text')?.textContent;
                if (!(chatDisplay.lastElementChild.classList.contains('assistant-message') && lastMsgText && lastMsgText.startsWith("当前平行时空题目"))) {
                     this.uiUpdateCallbacks.displayMessage("assistant", welcomeMessage, false, false, true, false);
                }
            } else {
                 this.uiUpdateCallbacks.displayMessage("assistant", welcomeMessage, false, false, true, false);
            }
        }
        this.uiUpdateCallbacks.setInputText("");
        if (this.uiUpdateCallbacks.setInputDisabled) {
            this.uiUpdateCallbacks.setInputDisabled(false);
        }
        this.focusInput();
        console.log("AiChatManager: Essay question context set. Mode switched to ESSAY_FEEDBACK_MODE.");
    }
    
    async sendMessage(userText) {
        if (!this.deepseekClient || !this.deepseekClient.isConfigured) {
            this.uiUpdateCallbacks.displayMessage("system", "AI客户端未初始化或配置错误，无法发送消息。", false, false, true, false);
            return;
        }
        if (this.isWaitingForAIResponse) {
            this.uiUpdateCallbacks.displayMessage("system", "AI正在思考中，请稍候...", false, false, true, false);
            return;
        }
        if (!userText.trim()) return;

        this.isWaitingForAIResponse = true;
        this.uiUpdateCallbacks.setLoadingState(true);
        this.uiUpdateCallbacks.displayMessage("user", userText, false, false, true, false);

        this.currentConversationHistory.push({ role: "user", content: userText });

        const conversationForApi = this._prepareConversationForApi();
        this.isFirstUserMessageInMode = false;

        this.uiUpdateCallbacks.displayMessage("assistant", "", true, false, false, true); // Thinking placeholder

        let fullAiResponse = "";
        let tokenCount = 0;
        let firstChunkReceived = false;

        try {
            await this.deepseekClient.generateContentStream(
                conversationForApi,
                (chunk) => {
                    if (!this.isWaitingForAIResponse) return;
                    const hasValidContent = chunk && chunk.trim().length > 0;
                    if (!firstChunkReceived && hasValidContent) {
                        this.uiUpdateCallbacks.displayMessage("assistant", chunk, true, false, false, false);
                        firstChunkReceived = true;
                    } else if (firstChunkReceived && hasValidContent) {
                        this.uiUpdateCallbacks.displayMessage("assistant", chunk, true, true, false, false);
                    }
                    if (chunk) fullAiResponse += chunk;
                },
                (finalTokens) => {
                    const hadAnyOutput = firstChunkReceived || fullAiResponse.length > 0;
                    if (!this.isWaitingForAIResponse && !hadAnyOutput) {
                        this.uiUpdateCallbacks.displayMessage("assistant", "(AI响应被中止)", false, false, true, false);
                        return;
                    }
                    if (!this.isWaitingForAIResponse && hadAnyOutput) return;

                    tokenCount = finalTokens;
                    if (fullAiResponse.trim() === "" && hadAnyOutput) {
                        this.uiUpdateCallbacks.displayMessage("assistant", "(AI未返回有效内容)", false, false, true, false);
                    } else if (fullAiResponse.trim() === "" && !hadAnyOutput) {
                        this.uiUpdateCallbacks.displayMessage("assistant", "(AI没有回复)", false, false, true, false);
                    } else if (fullAiResponse.trim() !== "") {
                        let renderedHtml = fullAiResponse;
                        if (window.markdownRenderer && typeof window.markdownRenderer.render === 'function') {
                            try { renderedHtml = window.markdownRenderer.render(fullAiResponse); }
                            catch (e) { console.error("Error rendering final Markdown:", e); }
                        }
                        this.uiUpdateCallbacks.displayMessage("assistant", renderedHtml, false, false, true, false);
                        this.currentConversationHistory.push({ role: "assistant", content: fullAiResponse });
                    }
                },
                (error) => {
                    console.error("AiChatManager: AI stream error:", error);
                    this.uiUpdateCallbacks.displayMessage("assistant", `抱歉，AI助手遇到错误：${error.message}`, false, false, true, false);
                }
            );
        } catch (error) {
            console.error("AiChatManager: Error calling generateContentStream:", error);
            this.uiUpdateCallbacks.displayMessage("assistant", `调用AI服务失败：${error.message}`, false, false, true, false);
        } finally {
            this.isWaitingForAIResponse = false;
            this.uiUpdateCallbacks.setLoadingState(false);
            if (window.apiMetricsManager && tokenCount > 0) {
                 window.apiMetricsManager.incrementCall(tokenCount);
            }
        }
    }

    abortAIResponse() {
        if (this.isWaitingForAIResponse && this.deepseekClient) {
            this.deepseekClient.abortStream();
            console.log("AiChatManager: AI response aborted by user.");
        }
    }

    _prepareConversationForApi() {
        let messages = [];
        const systemPrompt = this.systemPrompts[this.currentMode] || this.systemPrompts.general;
        let contextText = "";

        if (this.currentMode === 'diagnose' && this.studyReportProvider) {
            const studyReportJsonString = this.studyReportProvider();
            if (studyReportJsonString) {
                contextText += `\n\n--- 我的学习数据报告 (JSON格式) ---\n${studyReportJsonString}`;
                this.uiUpdateCallbacks.displayMessage("system", "学习报告已附加。", false, false, true, false);
            }
        } else if (this.currentMode === 'hint' || this.currentMode === 'explain') {
            if (this.currentQuestionContext) {
                const q = this.currentQuestionContext;
                contextText += `\n\n--- 相关题目信息 ---\n${JSON.stringify({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, userAnswer: q.userAnswer, isCorrect: q.isCorrect, explanation: q.explanation, section: q.section }, null, 2)}`;
                this.uiUpdateCallbacks.displayMessage("system", "选择题信息已附加。", false, false, true, false);
            }
        } else if (this.currentMode === 'essay_feedback' && this.currentEssayQuestionContext) {
            const essayContext = this.currentEssayQuestionContext;
            contextText += `\n\n--- 原始题目 ---\n${essayContext.question}\n\n--- AI参考答案 ---\n${essayContext.modelAnswer}\n\n--- AI参考解析/评分要点 ---\n${essayContext.explanation}`;
            this.uiUpdateCallbacks.displayMessage("system", "题目上下文已附加。", false, false, true, false);
        }
        
        messages.push({ role: "system", content: systemPrompt + contextText });
        
        this.currentConversationHistory.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });

        return messages;
    }
}

window.aiChatManager = new AiChatManager();