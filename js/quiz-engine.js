// --- START OF FILE quiz-engine.js ---

/**
学习助手应用 - 题库引擎模块
负责题库的运行、题目显示、答案处理、成绩统计等核心功能
*/

// Configuration for Daily Test
// --- MODIFICATION START ---
// 将每日一测的题库来源从旧的学科分类切换为新的章节分类，每章出10题。
const DAILY_TEST_CONFIG = [
    { subjectId: 'chapter_0', count: 10 }, // 绪论
    { subjectId: 'chapter_1', count: 10 }, // 第一章 史前至先秦
    { subjectId: 'chapter_2', count: 10 }, // 第二章 秦汉
    { subjectId: 'chapter_3', count: 10 }, // 第三章 三国两晋南北朝
    { subjectId: 'chapter_4', count: 10 }, // 第四章 隋唐
    { subjectId: 'chapter_5', count: 10 }, // 第五章 五代辽宋金元
    { subjectId: 'chapter_6', count: 10 }, // 第六章 明清
    { subjectId: 'chapter_7', count: 10 }  // 第七章 近现代
];
// --- MODIFICATION END ---

class QuizEngine {
    constructor() {
        this.currentQuizData = null;
        this.currentQuizMeta = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.answeredStatus = [];
        this.score = 0;
        this.incorrectQuestionsIndices = [];
        this.quizStartTime = null;
        this.quizEndTime = null;
        this.isReviewMode = false;
        this.isDailyTestMode = false;
        this.questionResults = [];

        if (window.AppConfig && window.AppConfig.APP_CONFIG && window.AppConfig.APP_CONFIG.ai) {
            this.aiConfig = window.AppConfig.APP_CONFIG.ai;
        } else {
            this.aiConfig = { key: '', baseUrl: '', model: '' };
            console.warn("QuizEngine: AI Config not fully available at construction time.");
        }

        this.isEditingQuestion = false;

        this.isAIDuelMode = false;
        this.aiDuelUserScore = 0;
        this.aiDuelAIScore = 0;
        this.aiDuelAIAnswers = [];
        this.aiDuelQuestions = [];
        this.aiDuelResponsePromise = null;

        this.initElements();
        this.setupEventListeners();
    }

    initElements() {
        this.quizContainer = document.getElementById('quizContainer');
        this.quizTitle = document.getElementById('quizTitle');
        this.quizSubtitle = document.getElementById('quizSubtitle');
        this.quizContentArea = document.getElementById('quizContentArea');
        this.quizArea = document.getElementById('quiz-area');
        this.finalScoreContainer = document.getElementById('finalScoreContainer');
        this.finalScoreSummaryDiv = document.getElementById('finalScoreSummary');
        this.progressBarContainer = document.getElementById('progressBarContainer');
        this.progressBar = document.getElementById('progressBar');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.reviewIncorrectBtn = document.getElementById('review-incorrect-btn');
        this.navigationControls = document.getElementById('navigationControls');
        this.quizCloseBtn = document.getElementById('quizCloseBtn');
    }

    setupEventListeners() {
        this.prevBtn.addEventListener('click', () => this.handlePrevious());
        this.nextBtn.addEventListener('click', () => this.handleNext());
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.reviewIncorrectBtn.addEventListener('click', () => this.startReviewIncorrect());
        this.quizCloseBtn.addEventListener('click', () => this.close());
    }

    start(subjectId, periodId, quizId) {
        if (!window.dataManager) {
            alert('数据管理器未加载，无法启动题库！');
            return;
        }
        const quiz = window.dataManager.getQuiz(subjectId, periodId, quizId);

        console.log(`[QuizEngine Debug] Starting quiz: ID=${quizId}, Subject=${subjectId}, Period=${periodId}`);
        // console.log("[QuizEngine Debug] Raw quiz data from dataManager:", JSON.parse(JSON.stringify(quiz))); // Can be very verbose

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            alert('题库数据错误或为空！');
            return;
        }

        this.currentQuizData = quiz.questions;
        this.currentQuizMeta = {
            id: quiz.id,
            name: quiz.name,
            subjectId: subjectId,
            periodId: periodId,
            description: quiz.description || '',
            difficulty: quiz.difficulty,
            quizType: quiz.quizType || "standard_mcq" // Ensure quizType is available
        };

        // console.log("[QuizEngine Debug] currentQuizMeta set with difficulty:", this.currentQuizMeta.difficulty, " (Original quiz.difficulty was:", quiz.difficulty, ")");

        this.isDailyTestMode = false;
        this.isAIDuelMode = false;

        this.quizTitle.textContent = quiz.name;
        this.quizSubtitle.textContent = quiz.description || "开始您的学习之旅！";

        this.initQuizState();
        this.show();
    }

    startDailyTest() {
        const today = new Date().toDateString();
        if (window.progressManager && typeof window.progressManager.getLastDailyDate === 'function' && window.progressManager.getLastDailyDate() === today) {
            if (!confirm('今日已进行过每日一测，确定要重新开始吗？（之前的每日一测进度和成绩不会被覆盖，会产生新的记录）')) {
                return;
            }
        }

        if (!window.dataManager || !window.progressManager) {
            alert('必要模块（数据或进度管理器）未加载，无法开始每日一测！');
            return;
        }

        const questions = [];
        DAILY_TEST_CONFIG.forEach(cfg => {
            if (window.dataManager.getRandomQuestions) {
                const subjectQuestions = window.dataManager.getRandomQuestions(cfg.subjectId, cfg.count);
                subjectQuestions.forEach(q => {
                    q.originalSubjectId = cfg.subjectId;
                    q.quizType = q.quizType || "standard_mcq"; // Ensure quizType for daily test questions
                });
                questions.push(...subjectQuestions);
            } else {
                console.warn(`DataManager.getRandomQuestions is not available for subject ${cfg.subjectId}`);
            }
        });

        if (questions.length === 0) {
            alert('题库题目不足，无法生成每日一测。请先通过管理面板添加更多题目。');
            return;
        }

        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        this.currentQuizData = questions;
        this.currentQuizMeta = {
            id: `daily_${Date.now()}`,
            name: '每日一测',
            subjectId: 'mixed_daily',
            periodId: 'daily_test',
            description: `包含 ${DAILY_TEST_CONFIG.map(c => `${window.dataManager.getData()?.[c.subjectId]?.name || c.subjectId} ${c.count}题`).join('，')}。`,
            quizType: "standard_mcq" // Daily test is generally MCQ
        };
        this.isDailyTestMode = true;
        this.isAIDuelMode = false; // Ensure AI Duel mode is off
        this.quizTitle.textContent = this.currentQuizMeta.name;
        this.quizSubtitle.textContent = this.currentQuizMeta.description;

        this.initQuizState();
        this.show();

        if (window.progressManager && typeof window.progressManager.setLastDailyDate === 'function') {
            window.progressManager.setLastDailyDate(today);
        }
    }

    prepareAIDuel() {
        console.log("[QuizEngine] prepareAIDuel() called.");
        if (window.app && typeof window.app.toggleAiDuelSubjectModal === 'function') {
            window.app.toggleAiDuelSubjectModal(true);
        } else {
            console.error("无法打开AI对决科目选择模态框。App或其方法未定义。");
            alert("启动AI对决时出错，请重试。");
        }
    }

    async startAIDuel(subjectId) {
        console.log(`[QuizEngine] Starting AI Duel for subject: ${subjectId}`);
        if (!window.dataManager || !window.aiDuelManager) {
            alert('AI对决所需模块未加载！');
            console.error("[QuizEngine] DataManager or AIDuelManager not available for AI Duel.");
            return;
        }

        this.aiDuelQuestions = window.dataManager.getRandomQuestionsFromSubject(subjectId, 10);

        if (this.aiDuelQuestions.length === 0) {
            alert(`科目 "${window.dataManager.getData()?.[subjectId]?.name || subjectId}" 下没有足够的题目进行AI对决。请至少添加10道题。`);
            console.warn(`[QuizEngine] Not enough questions for AI Duel in subject ${subjectId}. Found: ${this.aiDuelQuestions.length}`);
            return;
        }
        if (this.aiDuelQuestions.length < 10) {
            alert(`注意：科目 "${window.dataManager.getData()?.[subjectId]?.name || subjectId}" 下题目不足10道，将以 ${this.aiDuelQuestions.length} 道题进行对决。`);
        }
        
        this.aiDuelQuestions.forEach(q => {
            q.quizType = q.quizType || "standard_mcq"; // Ensure quizType for AI Duel questions
        });

        this.currentQuizData = this.aiDuelQuestions;
        this.currentQuizMeta = {
            id: `ai_duel_${Date.now()}`,
            name: `AI对决 - ${window.dataManager.getData()?.[subjectId]?.name || '未知科目'}`,
            subjectId: subjectId,
            periodId: 'ai_duel_mode',
            description: `与AI进行 ${this.aiDuelQuestions.length} 道题的较量！`,
            quizType: "standard_mcq" // AI Duel is MCQ
        };
        this.isAIDuelMode = true;
        this.isDailyTestMode = false;
        this.quizTitle.textContent = this.currentQuizMeta.name;
        this.quizSubtitle.textContent = this.currentQuizMeta.description;

        this.initQuizState(); // This will set this.quizStartTime

        try {
            console.log("[QuizEngine] Requesting AI answers for the duel...");
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                 window.uiManager.showToast("AI正在分析题目，请开始您的作答...", "info", 3000);
            }
            this.aiDuelResponsePromise = window.aiDuelManager.startDuel(this.aiDuelQuestions);
        } catch (error) {
            console.error("[QuizEngine] Failed to initiate AI response for duel:", error);
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast(`启动AI作答失败: ${error.message}. 您仍可作答，但无AI对比。`, 'error', 6000);
            }
            this.aiDuelResponsePromise = Promise.resolve(new Array(this.aiDuelQuestions.length).fill({ error: "AI未能作答" }));
        }

        this.show();
    }

    initQuizState() {
        this.currentQuestionIndex = 0;
        this.userAnswers = this.currentQuizData.map(q => {
            if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
                return null; // For essay_ai_feedback, userAnswers will store the index of the selected completion option (0 or 1)
            }
            return Array.isArray(q.correctAnswers) ? [] : null;
        });
        this.answeredStatus = new Array(this.currentQuizData.length).fill(false);
        this.questionResults = new Array(this.currentQuizData.length).fill(null).map(() => ({
            questionIndex: null,
            question: null,
            options: null,
            correctAnswer: null,
            userAnswer: null,
            isCorrect: null,
            explanation: null,
            section: null,
            originalSubjectId: null
        }));
        this.score = 0;
        this.incorrectQuestionsIndices = [];
        this.isReviewMode = false;
        // Do not reset isDailyTestMode or isAIDuelMode here as they are set by their respective start functions.

        // Set quizStartTime HERE
        this.quizStartTime = new Date();
        console.log("[QuizEngine Debug] Quiz Start Time set in initQuizState:", this.quizStartTime);

        this.quizContentArea.style.display = 'block';
        this.navigationControls.style.display = 'block';
        this.progressBarContainer.style.display = 'block';
        this.finalScoreContainer.style.display = 'none';

        this.displayQuestion(this.currentQuestionIndex);
    }

    show() {
        this.quizContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
    }

    close() {
        const hasAnsweredQuestions = this.answeredStatus.some(status => status);

        if (this.currentQuizData && hasAnsweredQuestions && this.finalScoreContainer.style.display === 'none') {
            console.log("Quiz closed prematurely with answered questions. Saving progress...");
            this.showFinalScore(); // Ensure score is shown and progress saved if applicable
        } else if (this.currentQuizData && !hasAnsweredQuestions) {
             console.log("Quiz closed without any answers submitted. No progress saved.");
        }

        if (this.isAIDuelMode && window.aiDuelManager) {
            console.log("[QuizEngine] Closing AI Duel mode, resetting AI Duel Manager.");
            window.aiDuelManager.reset();
        }

        this.quizContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        let otherModalOpen = false;
        if (window.uiManager?.leftSidebar?.classList.contains('active')) otherModalOpen = true;
        if (window.adminManager?.aiUploadModal?.classList.contains('active')) otherModalOpen = true;
        if (window.reviewManager?.reviewContainer?.style.display === 'block') otherModalOpen = true;
        if (window.app?.aiDuelSubjectModal?.classList.contains('active')) otherModalOpen = true;
        
        if (!otherModalOpen) {
            document.body.classList.remove('modal-open');
        }

        this.resetQuizEngineState();
    }

    resetQuizEngineState() {
        this.currentQuizData = null;
        this.currentQuizMeta = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.answeredStatus = [];
        this.questionResults = [];
        this.score = 0;
        this.incorrectQuestionsIndices = [];
        this.isReviewMode = false;
        this.isDailyTestMode = false; // Reset mode flags
        this.isAIDuelMode = false;    // Reset mode flags
        this.quizStartTime = null;    // Crucial: Reset start time
        this.quizEndTime = null;

        this.aiDuelUserScore = 0;
        this.aiDuelAIScore = 0;
        this.aiDuelAIAnswers = [];
        this.aiDuelQuestions = [];
        this.aiDuelResponsePromise = null;

        const duelInfo = this.quizArea ? this.quizArea.querySelector('.ai-duel-info') : null;
        if (duelInfo) duelInfo.remove();

        if (this.quizArea) this.quizArea.innerHTML = '';
        if (this.quizTitle) this.quizTitle.textContent = '题库标题';
        if (this.quizSubtitle) this.quizSubtitle.textContent = '题库描述';
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.textContent = '0%';
        }
        if (this.finalScoreSummaryDiv) this.finalScoreSummaryDiv.innerHTML = '';

        console.log("QuizEngine state has been reset.");
    }

    displayQuestion(index, isReview = false) {
        this.isReviewMode = isReview;
        this.isEditingQuestion = false;
        
        // Ensure answer slot exists and is correctly typed for the current question
        const questionDataForInitCheck = this.currentQuizData?.[index];
        if (questionDataForInitCheck) {
            if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
                if (this.userAnswers[index] === undefined) {
                    this.userAnswers[index] = null; // For essay_ai_feedback, userAnswers will store the index of the selected completion option (0 or 1)
                }
            } else {
                const isMulti = Array.isArray(questionDataForInitCheck.correctAnswers);
                if (this.userAnswers[index] === undefined || (isMulti && !Array.isArray(this.userAnswers[index])) || (!isMulti && Array.isArray(this.userAnswers[index]))) {
                    this.userAnswers[index] = isMulti ? [] : null;
                }
            }
        }

        if (!this.currentQuizData || index < 0 || index >= this.currentQuizData.length) {
            console.error("Cannot display question: Invalid index or no quiz data.", index, this.currentQuizData);
            if(this.currentQuizData && this.currentQuizData.length > 0 && this.allQuestionsAnswered()) {
                this.showFinalScore();
            } else if (this.currentQuizData && this.currentQuizData.length === 0) {
                 this.quizArea.innerHTML = '<p style="text-align:center; padding:20px;">此题库没有题目。</p>';
                 this.navigationControls.style.display = 'none';
            }
            return;
        }
        const questionData = this.currentQuizData[index];

        this.quizArea.innerHTML = '';
        const questionBlock = this.createQuestionBlock(questionData, index, isReview);
        this.quizArea.appendChild(questionBlock);

        // --- 核心修改：在所有模式下都显示编辑按钮 ---
        // 移除 if (isReview) 条件判断
        this.addEditQuestionButton(questionBlock, index);
        // --- 修改结束 ---

        this.updateNavigationButtons();
        if (!isReview) this.updateProgressBar();

        // --- AI Features (Buttons & Info) ---
        // AI Duel Info (if in AI Duel mode) should be at the very top of quizArea.
        if (this.isAIDuelMode) {
            let duelInfoEl = this.quizArea.querySelector('.ai-duel-info'); // This might be created outside questionBlock
            if (!duelInfoEl) {
                duelInfoEl = document.createElement('div');
                duelInfoEl.className = 'ai-duel-info';
                this.quizArea.insertBefore(duelInfoEl, this.quizArea.firstChild);
            }
            duelInfoEl.textContent = `AI正在思考... 您在第 ${index + 1}/${this.aiDuelQuestions.length} 题`;
        }

        // Add a container for AI action buttons
        let aiBtnContainer = questionBlock.querySelector('.ai-action-btn-container');
        if (!aiBtnContainer) {
            aiBtnContainer = document.createElement('div');
            aiBtnContainer.className = 'ai-action-btn-container';
            // Decide where to insert the container, e.g., after the question text but before options
            const questionTextElement = questionBlock.querySelector('.question-text');
            if (questionTextElement && questionTextElement.nextSibling) {
                questionBlock.insertBefore(aiBtnContainer, questionTextElement.nextSibling);
            } else {
                questionBlock.appendChild(aiBtnContainer); // Fallback
            }
        }

        if (!isReview) { // Only add interactive AI buttons in non-review mode
            // Add "AI提示" button for standard MCQ if unanswered
            if (this.currentQuizMeta.quizType !== "essay_ai_feedback" && !this.answeredStatus[index]) {
                this.addAIHintButton(aiBtnContainer, questionData);
            }

            // Always add "AI英语修仙" button (as a global feature)
            this.addAIEssayFeedbackModeButton(aiBtnContainer, questionData);

            // Add "AI解析" button for standard MCQ if answered
            if (this.currentQuizMeta.quizType !== "essay_ai_feedback" && this.answeredStatus[index]) {
                this.addAIExplanationButton(aiBtnContainer, questionData, index);
            }
        }
        // --- End AI Features ---

        // --- Post-answer/Review Display (Explanation & Highlighting) ---
        const optionsDiv = questionBlock.querySelector('.options');
        if ((!isReview && this.answeredStatus[index]) || isReview) {
            // If the question is answered or in review mode, show explanation and highlight options
            if (!questionBlock.querySelector('.explanation')) { // Prevent adding multiple explanations
                const explanationDiv = this.createExplanationDiv(questionData, index, isReview);
                questionBlock.appendChild(explanationDiv);
            }
            if (optionsDiv) {
                this.highlightAnsweredOptions(optionsDiv, index, questionData);
            }
        }
        // --- End Post-answer/Review Display ---

        this.quizContentArea.scrollTop = 0;
    }

    createQuestionBlock(questionData, index, isReview) {
        const questionBlock = document.createElement('div');
        questionBlock.classList.add('question-block');

        const questionHeader = this.createQuestionHeader(questionData, index, isReview);
        questionBlock.appendChild(questionHeader);

        const questionText = document.createElement('p');
        questionText.classList.add('question-text');
        questionText.innerHTML = questionData.question; // Use innerHTML if question text can contain HTML
        questionBlock.appendChild(questionText);

        // Options div creation will now also need to consider essay_ai_feedback
        const optionsDiv = this.createOptionsDiv(questionData, index, isReview);
        questionBlock.appendChild(optionsDiv);

        return questionBlock;
    }

    addAIHintButton(container, questionData) {
        if (!window.uiManager || typeof window.uiManager.activateAIChatMode !== 'function') {
            console.warn("UIManager or activateAIChatMode not available for AI Hint.");
            return;
        }
        const hintBtn = document.createElement('button');
        hintBtn.className = 'action-btn secondary ai-quiz-action-btn';
        hintBtn.innerHTML = '💡 AI提示';
        hintBtn.title = '获取AI对这道题的提示';
        hintBtn.addEventListener('click', () => {
            window.uiManager.activateAIChatMode('hint', questionData);
        });
        container.appendChild(hintBtn);
    }

    addAIExplanationButton(container, questionData, questionIndex) {
        if (!window.uiManager || typeof window.uiManager.activateAIChatMode !== 'function') {
            console.warn("UIManager or activateAIChatMode not available for AI Explanation.");
            return;
        }
        const explainBtn = document.createElement('button');
        explainBtn.className = 'action-btn primary ai-quiz-action-btn';
        explainBtn.innerHTML = '📝 AI解析';
        explainBtn.title = '获取AI对这道题的详细解析';
        explainBtn.addEventListener('click', () => {
            const dataForAI = {
                ...questionData,
                userAnswer: this.userAnswers[questionIndex],
                isCorrect: this.questionResults[questionIndex]?.isCorrect 
            };
            window.uiManager.activateAIChatMode('explain', dataForAI);
        });
        container.appendChild(explainBtn);
    }
  
    /**
     * NEW: 添加用于"平行时空"题目的全局互动按钮。
     * 无论题目类型，都可显示。
     */
    addAIEssayFeedbackModeButton(container, questionData) {
        if (!window.uiManager || typeof window.uiManager.activateAIChatMode !== 'function') {
            console.warn("UIManager or activateAIChatMode not available for AI扩展 button.");
            return;
        }

        const expandBtn = document.createElement('button');
        expandBtn.className = 'action-btn primary ai-quiz-action-btn'; // 样式可以复用

        // --- 核心修改 ---
        expandBtn.innerHTML = '🌍 平行时空';
        expandBtn.title = 'AI扩展：了解同一时期，世界其他地方的艺术动态';
        // --- 修改结束 ---

        expandBtn.addEventListener('click', () => {
            // 模式名称 'essay_feedback' 保持不变，因为它只是一个内部标识符
            // aiChatManager 会根据这个标识符使用我们修改后的新Prompt
            window.uiManager.activateAIChatMode('essay_feedback', questionData);
            if (window.aiChatManager && typeof window.aiChatManager.focusInput === 'function') {
                window.aiChatManager.focusInput();
            }
        });
        container.appendChild(expandBtn);
    }
  
    createQuestionHeader(questionData, index, isReview) {
        const questionHeader = document.createElement('div');
        questionHeader.classList.add('question-header');

        const sectionTitleDisplay = document.createElement('span');
        sectionTitleDisplay.classList.add('section-title-display');
        let sectionText = questionData.section || "综合";
        if (this.isDailyTestMode && questionData.quizName) {
            sectionText = `${questionData.quizName} - ${sectionText}`;
        }
        sectionTitleDisplay.textContent = sectionText;
        questionHeader.appendChild(sectionTitleDisplay);

        const questionNumberDisplay = document.createElement('span');
        questionNumberDisplay.classList.add('question-number-display');
        if (isReview && this.incorrectQuestionsIndices) { 
            questionNumberDisplay.textContent = `错题 ${this.currentIncorrectReviewIndex + 1} / ${this.incorrectQuestionsIndices.length}`;
        } else if (this.currentQuizData){ 
            questionNumberDisplay.textContent = `题目 ${index + 1} / ${this.currentQuizData.length}`;
        } else {
            questionNumberDisplay.textContent = `题目 ${index + 1}`;
        }
        questionHeader.appendChild(questionNumberDisplay);

        return questionHeader;
    }

    createOptionsDiv(questionData, index, isReview) {
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('options');

        let optionsToDisplay = questionData.options;
        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback" && !isReview) {
            // For essay AI feedback, options are predefined for completion status
            optionsToDisplay = [
                "标记：AI互动完成 - 感觉良好",
                "标记：AI互动完成 - 仍需复习"
            ];
        }

        optionsToDisplay.forEach((option, i) => {
            const label = this.createOptionLabel(option, index, i, isReview, questionData, optionsToDisplay);
            optionsDiv.appendChild(label);
        });

        return optionsDiv;
    }

    createOptionLabel(option, questionIndex, optionIndex, isReview, questionData, currentOptionsArray) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        
        // Determine if it's multi-choice based on original questionData, not for essay_ai_feedback completion options
        let isMulti = false;
        if (this.currentQuizMeta && this.currentQuizMeta.quizType !== "essay_ai_feedback") {
            isMulti = Array.isArray(questionData.correctAnswers);
        }
        // Essay AI feedback completion options are like radio buttons (single choice)
        
        input.type = isMulti ? 'checkbox' : 'radio';
        input.name = `question${questionIndex}`;
        input.id = `q${questionIndex}_option${optionIndex}`;
        input.value = optionIndex; // This value is crucial
        label.htmlFor = input.id;

        const customInputSpan = document.createElement('span');
        customInputSpan.classList.add(isMulti ? 'custom-checkbox' : 'custom-radio');

        const optionTextSpan = document.createElement('span');
        optionTextSpan.classList.add('option-text');
        optionTextSpan.textContent = option;

        if (!this.answeredStatus[questionIndex] && !isReview) {
            if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
                // For essay, userAnswer is the index of the selected completion option
                if (this.userAnswers[questionIndex] === optionIndex) {
                    input.checked = true;
                    label.classList.add('selected-option');
                }
            } else { // Standard MCQ logic
                if (isMulti) {
                    if (Array.isArray(this.userAnswers[questionIndex]) && this.userAnswers[questionIndex].includes(optionIndex)) {
                        input.checked = true;
                        label.classList.add('selected-option');
                    }
                } else {
                    if (this.userAnswers[questionIndex] === optionIndex) {
                        input.checked = true;
                        label.classList.add('selected-option');
                    }
                }
            }
        }

        input.disabled = this.answeredStatus[questionIndex] || isReview;
        if (isReview || this.answeredStatus[questionIndex]) {
            label.classList.add('answered-option');
            if (isReview) label.classList.add('disabled-option');
        }

        input.addEventListener('change', () => {
            if (!this.answeredStatus[questionIndex] && !isReview) {
                if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
                    this.userAnswers[questionIndex] = optionIndex; // Store the selected completion option index
                    this.updateSelectedOption(label.parentNode, label); // Visually update selection
                } else if (isMulti) {
                    const currentAnswers = this.userAnswers[questionIndex] || []; 
                    if (input.checked) {
                        if (!currentAnswers.includes(optionIndex)) currentAnswers.push(optionIndex);
                    } else {
                        const idxToRemove = currentAnswers.indexOf(optionIndex);
                        if (idxToRemove > -1) currentAnswers.splice(idxToRemove, 1);
                    }
                    this.userAnswers[questionIndex] = [...currentAnswers];
                    label.classList.toggle('selected-option', input.checked);
                } else {
                    this.userAnswers[questionIndex] = optionIndex;
                    this.updateSelectedOption(label.parentNode, label);
                }

                this.updateNavigationButtons(); // Ensure button states are updated
            }
        });

        label.appendChild(input);
        label.appendChild(customInputSpan);
        label.appendChild(optionTextSpan);

        return label;
    }
  
    updateSelectedOption(optionsDiv, selectedLabel) {
        optionsDiv.querySelectorAll('label').forEach(lbl => {
            // Only remove for radio-like behavior (single choice or essay feedback options)
            if (lbl.querySelector('input[type="radio"]')) {
                lbl.classList.remove('selected-option');
            }
        });
        selectedLabel.classList.add('selected-option');
    }

    createExplanationDiv(questionData, index, isReview) {
        const explanationDiv = document.createElement('div');
        explanationDiv.classList.add('explanation');
        
        const userAnswer = this.userAnswers[index];
        let explanationHTML = '';
        let isUserCorrect = false; // Default to false

        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // For essay_ai_feedback, the "explanation" is the AI's reference answer/guidance.
            // The "correctness" is based on the user's self-assessment option.
            explanationHTML = `<strong>AI 参考解析/指导：</strong> ${questionData.explanation || "暂无参考解析。"}`;
            
            if (userAnswer === 0) { // "感觉良好"
                isUserCorrect = true; // Considered "correct" for highlighting/display purposes
                explanationDiv.classList.add('correct');
                explanationHTML += `<span class='user-answer-indicator'><br><strong>您的标记：：</strong> AI互动完成 - 感觉良好</span>`;
            } else if (userAnswer === 1) { // "仍需复习"
                isUserCorrect = false; // Considered "incorrect" for highlighting
                explanationDiv.classList.add('incorrect');
                explanationHTML += `<span class='user-answer-indicator'><br><strong>您的标记：：</strong> AI互动完成 - 仍需复习</span>`;
            } else {
                // No option selected or unexpected value - treat as needs review
                explanationDiv.classList.add('neutral'); // Or some other class
                explanationHTML += `<span class='user-answer-indicator'><br><strong>您的标记：</strong> 未完成评估</span>`;
            }
        } else {
            // Standard MCQ explanation
            const isMulti = Array.isArray(questionData.correctAnswers);
            const correctAnswers = isMulti ? questionData.correctAnswers : [questionData.correctAnswer];
            explanationHTML = `<strong>解析：：</strong> ${questionData.explanation || "暂无解析。"}`;

            if (isMulti) {
                const sortedUserAnswers = Array.isArray(userAnswer) ? [...userAnswer].sort((a, b) => a - b) : [];
                const sortedCorrectAnswers = [...correctAnswers].sort((a, b) => a - b);
                isUserCorrect = sortedUserAnswers.length === sortedCorrectAnswers.length &&
                                sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx]);
            } else {
                isUserCorrect = userAnswer === questionData.correctAnswer;
            }

            if (isUserCorrect) {
                explanationDiv.classList.add('correct');
                explanationHTML += `<span class='user-answer-indicator'><br><strong>您的选择：</strong> 正确！</span>`;
            } else {
                explanationDiv.classList.add('incorrect');
                let userChoiceText;
                if (isMulti) {
                    userChoiceText = Array.isArray(userAnswer) && userAnswer.length > 0
                        ? userAnswer.map(i => questionData.options[i]).join('、 ')
                        : '未选择或选择无效';
                } else {
                    userChoiceText = userAnswer !== null && typeof questionData.options[userAnswer] !== 'undefined'
                        ? questionData.options[userAnswer]
                        : '未选择或无效选项';
                }
                explanationHTML += `<span class='user-answer-indicator'><br><strong>您的选择：：</strong> ${userChoiceText} (错误)</span>`;

                const correctAnswerText = correctAnswers
                    .map(i => (typeof questionData.options[i] !== 'undefined' ? questionData.options[i] : `选项${i+1}无效`))
                    .join('、 ');
                explanationHTML += `<span class='correct-answer-indicator'><br><strong>正确答案：：</strong> ${correctAnswerText}</span>`;
            }
        }
        explanationDiv.innerHTML = explanationHTML;
        return explanationDiv;
    }

    highlightAnsweredOptions(optionsDiv, qIndex, questionData) {
        const labels = optionsDiv.querySelectorAll('label');
        const userAnswer = this.userAnswers[qIndex];

        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // For essay_ai_feedback, highlight based on the selected completion option
            labels.forEach((label, i) => {
                const input = label.querySelector('input');
                if (input) input.disabled = true;
                label.classList.add('answered-option');
                
                if (userAnswer === i) { // If this was the user's selected completion option
                    label.classList.add('selected-option'); // Keep it visually selected
                    if (userAnswer === 0) { // "感觉良好"
                        label.classList.add('correct-answer-highlight'); // Or a specific "good" class
                    } else if (userAnswer === 1) { // "仍需复习"
                        label.classList.add('incorrect-user-choice'); // Or a specific "review" class
                    }
                }
            });
        } else {
            // Standard MCQ highlighting
            const isMulti = Array.isArray(questionData.correctAnswers);
            const correctAnswers = isMulti ? questionData.correctAnswers : [questionData.correctAnswer];

            labels.forEach((label, i) => {
                const input = label.querySelector('input');
                if (input) input.disabled = true;

                label.classList.remove('selected-option');
                label.classList.add('answered-option');

                const isCorrectOption = correctAnswers.includes(i);
                const isUserSelectedOption = isMulti ? (Array.isArray(userAnswer) && userAnswer.includes(i)) : (userAnswer === i);

                if (isCorrectOption) {
                    label.classList.add('correct-answer-highlight');
                    if (!isUserSelectedOption && isMulti) {
                        label.classList.add('missed-correct-highlight');
                    }
                } else if (isUserSelectedOption) {
                    label.classList.add('incorrect-user-choice');
                }
            });
        }
    }

    handlePrevious() {
        if (this.isReviewMode) {
            if (this.currentIncorrectReviewIndex > 0) {
                this.currentIncorrectReviewIndex--;
                this.displayQuestion(this.incorrectQuestionsIndices[this.currentIncorrectReviewIndex], true);
            }
        } else {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--;
                this.displayQuestion(this.currentQuestionIndex);
            }
        }
    }

    handleNext() {
        if (this.isReviewMode) {
            if (this.nextBtn.textContent.includes('完成回顾')) {
                this.endReview();
            } else if (this.incorrectQuestionsIndices && this.currentIncorrectReviewIndex < this.incorrectQuestionsIndices.length - 1) {
                this.currentIncorrectReviewIndex++;
                this.displayQuestion(this.incorrectQuestionsIndices[this.currentIncorrectReviewIndex], true);
            }
        } else {
            if (this.nextBtn.textContent.includes('查看结果') || this.nextBtn.textContent.includes('查看对决结果')) {
                this.showFinalScore();
            } else if (this.currentQuizData && this.currentQuestionIndex < this.currentQuizData.length - 1) {
                this.currentQuestionIndex++;
                this.displayQuestion(this.currentQuestionIndex);
            }
        }
    }
  
    handleSubmit() {
        if (!this.currentQuizData || !this.currentQuizData[this.currentQuestionIndex]) return; 
        const questionData = this.currentQuizData[this.currentQuestionIndex];
        const userAnswer = this.userAnswers[this.currentQuestionIndex]; // This is user's choice index (0 or 1 for essay, option index for MCQ)

        if (!this.answeredStatus[this.currentQuestionIndex]) {
            let needsAnswer = false;
            if (this.currentQuizMeta.quizType === "essay_ai_feedback") {
                if (userAnswer === null || userAnswer === undefined) { // User must select a completion status
                    needsAnswer = true;
                }
            } else {
                const isMulti = Array.isArray(questionData.correctAnswers);
                if ((isMulti && (!Array.isArray(userAnswer) || userAnswer.length === 0)) || (!isMulti && userAnswer === null)) {
                    needsAnswer = true;
                }
            }
            if (needsAnswer) {
                alert('请选择一个答案或标记完成后再提交！');
                return;
            }
        }

        if (this.answeredStatus[this.currentQuestionIndex]) return;

        this.answeredStatus[this.currentQuestionIndex] = true;
        let isCorrect;

        if (this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // For essay_ai_feedback, isCorrect is based on user's self-assessment choice
            if (userAnswer === 0) { // "标记：AI互动完成-感觉良好"
                isCorrect = true;
            } else if (userAnswer === 1) { // "标记：AI互动完成-仍需复习"
                isCorrect = false;
                // For "essay_ai_feedback", if "仍需复习" is chosen, we might want to add it to incorrectQuestionsIndices for review.
                // However, this type doesn't contribute to `this.score`.
                // Let's decide if "仍需复习" should make it appear in the "review incorrect" list.
                // For consistency, if isCorrect is false, it should be added to incorrectQuestionsIndices.
                this.incorrectQuestionsIndices.push(this.currentQuestionIndex); 
            } else {
                isCorrect = false; // Abnormal case, default to needing review
                this.incorrectQuestionsIndices.push(this.currentQuestionIndex);
                console.warn("Essay AI Feedback quiz answered with unexpected option index:", userAnswer);
            }
            // This type of question does not contribute to this.score
        } else {
            // Original MCQ scoring logic
            const isMulti = Array.isArray(questionData.correctAnswers);
            if (isMulti) {
                 const sortedUserAnswers    = Array.isArray(userAnswer)    ? [...userAnswer].sort((a, b) => a - b) : [];
                 const sortedCorrectAnswers = [...questionData.correctAnswers].sort((a, b) => a - b);
                 isCorrect = sortedUserAnswers.length === sortedCorrectAnswers.length &&
                               sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx]);
            } else {
                isCorrect = userAnswer === questionData.correctAnswer;
            }

            if (isCorrect) {
                this.score++;
            } else {
                this.incorrectQuestionsIndices.push(this.currentQuestionIndex);
            }
        }

        // Record to questionResults (applies to all types)
        this.questionResults[this.currentQuestionIndex] = {
            questionIndex: this.currentQuestionIndex,
            question: questionData.question,
            // For essay_ai_feedback, options are the completion markers, not the original question options (if any)
            // However, for review/results, it might be better to store the original options if they existed for essay.
            // For now, let's use the options that were displayed to the user during answering.
            options: (this.currentQuizMeta.quizType === "essay_ai_feedback") ? 
                     ["标记：AI互动完成 - 感觉良好", "标记：AI互动完成 - 仍需复习"] : 
                     questionData.options,
            // For essay_ai_feedback, 'correctAnswer' might be the ideal AI response or simply the 'explanation'.
            // The instruction defines it as `questionData.correctAnswer` for essay_ai_feedback.
            // This `correctAnswer` field in `questionData` for an essay question should ideally be the target answer or detailed guidance.
            correctAnswer: (this.currentQuizMeta.quizType === "essay_ai_feedback") ? 
                           questionData.correctAnswer : // Assuming this holds the AI's ideal response/guidance for essay
                           (Array.isArray(questionData.correctAnswers) ? questionData.correctAnswers : questionData.correctAnswer),
            userAnswer: userAnswer, // For essay_ai_feedback, this is 0 or 1
            isCorrect: isCorrect, // Based on the logic above
            explanation: questionData.explanation, // For essay_ai_feedback, this is AI's reference.
            section: questionData.section,
            originalSubjectId: (this.isDailyTestMode || this.isAIDuelMode) ? questionData.originalSubjectId : (this.currentQuizMeta ? this.currentQuizMeta.subjectId : null),
            quizType: this.currentQuizMeta.quizType // Store quiz type for later analysis
        };

        this.displayQuestion(this.currentQuestionIndex); 
        this.updateProgressBar();
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        this.prevBtn.innerHTML = this.isReviewMode ? '← 上一错题' : '← 上一题';
        
        const totalQuestions = this.currentQuizData?.length || 0;
        const currentIndex = this.isReviewMode ? this.currentIncorrectReviewIndex : this.currentQuestionIndex;
        const answeredCurrent = this.answeredStatus[currentIndex];

        // Default submit button text, can be overridden below
        this.submitBtn.innerHTML = '提交答案 ✓';
        
        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback" && !this.isReviewMode) {
            this.prevBtn.disabled = currentIndex === 0;
            this.submitBtn.style.display = answeredCurrent ? 'none' : 'inline-flex';
            // For essay_ai_feedback, submit button is enabled if ANY completion option is selected
            const isOptionSelected = this.userAnswers[currentIndex] !== null && this.userAnswers[currentIndex] !== undefined;
            this.submitBtn.disabled = !isOptionSelected; // Disable submit if no option selected
            this.submitBtn.innerHTML = '确认标记 ✓'; // Change text for essay type


            if (currentIndex === totalQuestions - 1 && this.allQuestionsAnswered()) {
                this.nextBtn.innerHTML = '查看结果 🏁';
                this.nextBtn.disabled = false;
            } else {
                this.nextBtn.innerHTML = '下一题 →';
                this.nextBtn.disabled = !answeredCurrent || (currentIndex === totalQuestions - 1 && !this.allQuestionsAnswered());
            }

        } else if (this.isAIDuelMode) {
            this.prevBtn.disabled = currentIndex === 0;
            this.submitBtn.style.display = answeredCurrent ? 'none' : 'inline-flex';
            this.submitBtn.disabled = answeredCurrent; // If already answered, disable submit

            if (currentIndex === totalQuestions - 1 && this.allQuestionsAnswered()) {
                this.nextBtn.innerHTML = '查看对决结果 🏁';
                this.nextBtn.disabled = false;
            } else {
                this.nextBtn.innerHTML = '下一题 →';
                this.nextBtn.disabled = !answeredCurrent || currentIndex === totalQuestions - 1;
            }
        } else if (this.isReviewMode) {
            this.prevBtn.disabled = currentIndex === 0;
            this.nextBtn.disabled = false; 
            this.nextBtn.innerHTML = (currentIndex === (this.incorrectQuestionsIndices?.length || 0) - 1) ?
                '完成回顾 🏁' : '下一错题 →';
            this.submitBtn.style.display = 'none'; // No submit button in review mode
        } else { // Regular quiz or daily test (non-essay)
            this.prevBtn.disabled = currentIndex === 0;
            if (currentIndex === totalQuestions - 1 && this.allQuestionsAnswered()) {
                this.nextBtn.innerHTML = '查看结果 🏁';
                this.nextBtn.disabled = false;
                this.submitBtn.style.display = 'none';
            } else {
                this.nextBtn.innerHTML = '下一题 →';
                this.nextBtn.disabled = !answeredCurrent || (currentIndex === totalQuestions - 1 && !this.allQuestionsAnswered());
                this.submitBtn.style.display = answeredCurrent ? 'none' : 'inline-flex';
            }
            // For standard MCQs, disable submit button if no option selected
            const isOptionSelected = this.userAnswers[currentIndex] !== null && this.userAnswers[currentIndex] !== undefined &&
                                     (!Array.isArray(this.userAnswers[currentIndex]) || this.userAnswers[currentIndex].length > 0);
            this.submitBtn.disabled = answeredCurrent || !isOptionSelected;
        }
    }
  
    allQuestionsAnswered() {
        if (!this.currentQuizData) return false;
        return this.answeredStatus.length === this.currentQuizData.length && this.answeredStatus.every(status => status === true);
    }

    updateProgressBar() {
        if (!this.currentQuizData || this.currentQuizData.length === 0) {
             this.progressBar.style.width = '0%';
             this.progressBar.textContent = '0%';
             return;
        }
        const answeredCount = this.answeredStatus.filter(status => status === true).length;
        const progress = (answeredCount / this.currentQuizData.length) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.progressBar.textContent = `${Math.round(progress)}%`;
    }

    async showFinalScore() {
        this.quizEndTime = new Date();
        console.log("[QuizEngine Debug] Quiz End Time set in showFinalScore:", this.quizEndTime);
        if (!this.quizStartTime || !(this.quizStartTime instanceof Date)) {
            console.error("[QuizEngine Error] quizStartTime is invalid at showFinalScore! Value:", this.quizStartTime);
            this.quizStartTime = this.quizEndTime; // Fallback to prevent NaN/huge time
        }
        console.log("[QuizEngine Debug] Quiz Start Time at showFinalScore:", this.quizStartTime);

        const timeTaken = this.quizEndTime - this.quizStartTime;
        console.log("[QuizEngine Debug] Time Taken (ms):", timeTaken);

        const totalQuestionsInQuiz = this.currentQuizData ? this.currentQuizData.length : 0;
        
        // For "essay_ai_feedback", score is not calculated in the traditional sense.
        // Accuracy calculation needs to consider this.
        let relevantQuestionsForAccuracy = totalQuestionsInQuiz;
        let relevantScore = this.score;

        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // For pure essay feedback quizzes, accuracy might not be relevant, or defined differently.
            // Here, 'score' would be the count of "felt good". Let's display this.
            // The `this.score` variable itself is NOT incremented for essay_ai_feedback in handleSubmit.
            // We need to calculate "felt good" count from questionResults.
            relevantScore = this.questionResults.filter(qr => qr && qr.quizType === "essay_ai_feedback" && qr.isCorrect === true).length;
            // Total questions for essay accuracy would be all essay questions.
            // If the quiz is mixed, this needs more complex handling. Assuming pure essay_ai_feedback quiz for now if this block is hit.
        }
        
        const accuracy = relevantQuestionsForAccuracy > 0 ? (relevantScore / relevantQuestionsForAccuracy) * 100 : 0;


        this.quizContentArea.style.display = 'none';
        this.navigationControls.style.display = 'none';
        this.progressBarContainer.style.display = 'none';
        this.finalScoreContainer.style.display = 'flex';

        if (this.isAIDuelMode) { // AI Duel has its own result display
            if (this.finalScoreSummaryDiv) {
                this.finalScoreSummaryDiv.classList.add('ai-duel-result');
                 this.finalScoreSummaryDiv.classList.remove('essay-feedback-result'); // Ensure no conflict
            }
            this.finalScoreSummaryDiv.innerHTML = `
                <div class="ai-duel-loading">
                    <h3>AI对决结束！</h3>
                    <p>正在获取AI成绩并进行对比...</p>
                    <div class="spinner" style="margin: 20px auto;"></div>
                </div>`;

            try {
                console.log("[QuizEngine] Waiting for AI duel response promise to resolve...");
                if (!this.aiDuelResponsePromise) {
                    throw new Error("AI对决的响应Promise未初始化。");
                }
                this.aiDuelAIAnswers = await this.aiDuelResponsePromise;
                console.log("[QuizEngine] AI duel answers received:", this.aiDuelAIAnswers);

                this.aiDuelUserScore = this.score; // Standard MCQ score for user
                this.aiDuelAIScore = 0;

                let comparisonHTML = '';
                (this.aiDuelQuestions || []).forEach((q, i) => {
                    const userResult = this.questionResults[i];
                    const userCorrect = userResult ? userResult.isCorrect : false;
                    const aiAnswerRaw = this.aiDuelAIAnswers?.[i];
                    let aiIsCorrect = false;
                    let aiSelectedOptionText = "AI未作答或出错";

                    if (aiAnswerRaw !== null && typeof aiAnswerRaw === 'object' && aiAnswerRaw.error) {
                        aiSelectedOptionText = `AI错误: ${aiAnswerRaw.error}`;
                    } else if (aiAnswerRaw !== null && aiAnswerRaw !== undefined) {
                        if (Array.isArray(q.correctAnswers)) { // Multi-choice
                            const sortedAIAnswers = Array.isArray(aiAnswerRaw) ? [...aiAnswerRaw].sort((a,b)=>a-b) : [];
                            const sortedCorrect = [...q.correctAnswers].sort((a,b)=>a-b);
                            aiIsCorrect = sortedAIAnswers.length === sortedCorrect.length && sortedAIAnswers.every((val, idx) => val === sortedCorrect[idx]);
                            aiSelectedOptionText = sortedAIAnswers.length > 0 ? sortedAIAnswers.map(idx => q.options[idx] || `选项${idx + 1}无效`).join(', ') : "未选";
                        } else { // Single-choice
                            aiIsCorrect = aiAnswerRaw === q.correctAnswer;
                            aiSelectedOptionText = (q.options && typeof q.options[aiAnswerRaw] !== 'undefined') ? q.options[aiAnswerRaw] : "选项无效";
                        }
                        if (aiIsCorrect) this.aiDuelAIScore++;
                    }
                    
                    const userAnswerText = userResult ?
                        (Array.isArray(userResult.userAnswer) ?
                            (userResult.userAnswer.length > 0 ? userResult.userAnswer.map(idx => q.options[idx] || `选项${idx + 1}无效`).join(', ') : "未作答") :
                            (userResult.userAnswer !== null && q.options && q.options[userResult.userAnswer] !== undefined ? q.options[userResult.userAnswer] : '未作答或选项无效')
                        ) : '未作答';

                    comparisonHTML += `
                        <div class="duel-comparison-item">
                            <div class="comparison-question-header">
                                <strong>题目 ${i + 1}:</strong>
                                <span class="comparison-question-text">${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}</span>
                            </div>
                            <div class="comparison-answers">
                                <div class="answer-row user-answer-row ${userCorrect ? 'correct' : 'incorrect'}">
                                    <span class="answer-label">你的选择:</span>
                                    <span class="answer-text">${userAnswerText}</span>
                                    <span class="answer-result-icon">${userCorrect ? '✅' : '❌'}</span>
                                </div>
                                <div class="answer-row ai-answer-row ${aiIsCorrect ? 'correct' : 'incorrect'}">
                                    <span class="answer-label">AI的选择:</span>
                                    <span class="answer-text">${aiSelectedOptionText}</span>
                                    <span class="answer-result-icon">${aiIsCorrect ? '✅' : '❌'}</span>
                                </div>
                                <div class="answer-row correct-answer-info">
                                    <span class="answer-label">正确答案:</span>
                                    <span class="answer-text">${!Array.isArray(q.correctAnswers) ? `${q.options[q.correctAnswer] || '未知'}` : `${q.correctAnswers.map(idx => q.options[idx] || '未知').join(', ')}`}</span>
                                </div>
                            </div>
                        </div>`;
                });

                const userAccuracy = totalQuestionsInQuiz > 0 ? (this.aiDuelUserScore / totalQuestionsInQuiz) * 100 : 0;
                const aiAccuracy = totalQuestionsInQuiz > 0 ? (this.aiDuelAIScore / totalQuestionsInQuiz) * 100 : 0;

                let duelOutcomeMessage = "";
                let outcomeClass = "tie";
                if (userAccuracy > aiAccuracy) {
                    duelOutcomeMessage = "🎉 恭喜你战胜了AI！你真棒！";
                    outcomeClass = "win";
                } else if (userAccuracy < aiAccuracy) {
                    duelOutcomeMessage = "🤖 AI略胜一筹，继续加油！";
                    outcomeClass = "loss";
                } else {
                    duelOutcomeMessage = "🤝 旗鼓相当！下次再战！";
                }

                this.finalScoreSummaryDiv.innerHTML = `
                    <div class="ai-duel-header">
                        <h3>AI对决结束！</h3>
                        <p class="duel-outcome-message ${outcomeClass}">${duelOutcomeMessage}</p>
                    </div>
                
                    <div class="duel-scores-container">
                        <div class="duel-score-card player-score">
                            <h4><span class="duel-player-icon">👤</span> 你的成绩</h4>
                            <p class="score-value">${this.aiDuelUserScore} / ${totalQuestionsInQuiz}</p>
                            <p class="accuracy-value">正确率: ${userAccuracy.toFixed(1)}%</p>
                        </div>
                        <div class="duel-vs-separator">VS</div>
                        <div class.duel-score-card ai-score">
                            <h4><span class="duel-player-icon">🤖</span> AI的成绩</h4>
                            <p class="score-value">${this.aiDuelAIScore} / ${totalQuestionsInQuiz}</p>
                            <p class="accuracy-value">正确率: ${aiAccuracy.toFixed(1)}%</p>
                        </div>
                    </div>
                
                    <div class="duel-meta-info">
                        <p><span>总用时：</span> <span>${Utils.formatTime(timeTaken)}</span></p>
                    </div>
                
                    <div class="duel-comparison-container">
                        <h4>详细对比：</h4>
                        ${comparisonHTML}
                    </div>
                `;
                this.reviewIncorrectBtn.style.display = this.incorrectQuestionsIndices.length > 0 ? 'inline-flex' : 'none';

                console.log("[QuizEngine] AI Duel finished. User score:", this.aiDuelUserScore, "AI score:", this.aiDuelAIScore);
                if (window.aiDuelManager) window.aiDuelManager.reset();

            } catch (error) {
                console.error("[QuizEngine] Error processing AI duel results:", error);
                this.finalScoreSummaryDiv.innerHTML = `
                    <h3>AI对决结果处理失败</h3>
                    <p>抱歉，获取AI作答结果时出现问题：${error.message}</p>
                    <p>你的成绩：${this.score}/${totalQuestionsInQuiz} (正确率: ${accuracy.toFixed(1)}%)</p>
                    <p>请稍后再试或联系管理员。</p>
                `;
                if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast(`AI对决结果处理失败: ${error.message}`, 'error', 5000);
                }
            }

        } else if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // Specific result display for "essay_ai_feedback"
            if (this.finalScoreSummaryDiv) {
                this.finalScoreSummaryDiv.classList.add('essay-feedback-result');
                this.finalScoreSummaryDiv.classList.remove('ai-duel-result');
            }
            const feltGoodCount = this.questionResults.filter(qr => qr && qr.quizType === "essay_ai_feedback" && qr.isCorrect === true).length;
            const needsReviewCount = this.questionResults.filter(qr => qr && qr.quizType === "essay_ai_feedback" && qr.isCorrect === false).length;
            
            this.finalScoreSummaryDiv.innerHTML = `
                <h3>AI互动练习完成！</h3>
                <p><span>总题目数：</span> <span>${totalQuestionsInQuiz}</span></p>
                <p><span>标记为"感觉良好"：</span> <span>${feltGoodCount}</span></p>
                <p><span>标记为"仍需复习"：</span> <span>${needsReviewCount}</span></p>
                <p><span>总用时：</span> <span>${Utils.formatTime(timeTaken)}</span></p>
            `;
            // "Review Incorrect" button logic for essay: review those marked "仍需复习"
            this.reviewIncorrectBtn.style.display = needsReviewCount > 0 ? 'inline-flex' : 'none';

        } else { // Regular quiz or daily test (non-essay, non-duel)
             if (this.finalScoreSummaryDiv) {
                this.finalScoreSummaryDiv.classList.remove('ai-duel-result', 'essay-feedback-result');
            }
            this.finalScoreSummaryDiv.innerHTML = `
                <h3>${this.isDailyTestMode ? '每日一测 ' : ''}测试完成！</h3>
                <p><span>总题目数：</span> <span>${totalQuestionsInQuiz}</span></p>
                <p><span>答对题数：</span> <span>${this.score}</span></p>
                <p><span>答错题数：</span> <span>${this.incorrectQuestionsIndices.length}</span></p>
                <p class="accuracy"><span>正确率：</span> <span>${accuracy.toFixed(1)}%</span></p>
                <p><span>总用时：</span> <span>${Utils.formatTime(timeTaken)}</span></p>
            `;
            this.reviewIncorrectBtn.style.display = this.incorrectQuestionsIndices.length > 0 ? 'inline-flex' : 'none';
        }

        // Common logic for saving progress (applies to all types)
        if (window.progressManager && this.currentQuizMeta && totalQuestionsInQuiz > 0 && this.quizStartTime) {
            const validQuestionResults = this.questionResults.filter(qr =>
                  qr &&
                  qr.questionIndex !== null &&
                  (Array.isArray(qr.userAnswer) || qr.userAnswer !== null || qr.quizType === "essay_ai_feedback") && // userAnswer can be null for essay if not marked
                  qr.isCorrect !== null // isCorrect must be determined
              );

            // Enrich results with subject/period IDs
            validQuestionResults.forEach(qr => {
                  const originalQuestionData = this.currentQuizData[qr.questionIndex];
                  qr.subjectId = (this.isDailyTestMode || this.isAIDuelMode) ? 
                                 originalQuestionData?.originalSubjectId || this.currentQuizMeta.subjectId :
                                 this.currentQuizMeta.subjectId;
                  qr.periodId = this.currentQuizMeta.periodId; // For daily/duel, this is 'daily_test' or 'ai_duel_mode'
              });

            window.progressManager.recordQuizResult({
                quizId: this.currentQuizMeta.id,
                subjectId: this.currentQuizMeta.subjectId,
                periodId: this.currentQuizMeta.periodId,
                quizName: this.currentQuizMeta.name,
                startTime: this.quizStartTime.toISOString(),
                endTime: this.quizEndTime.toISOString(),
                totalQuestions: totalQuestionsInQuiz,
                correctAnswers: (this.currentQuizMeta.quizType === "essay_ai_feedback") ? relevantScore : this.score, // Use relevant score for essay
                incorrectAnswers: (this.currentQuizMeta.quizType === "essay_ai_feedback") ? 
                                  this.questionResults.filter(qr => qr && qr.quizType === "essay_ai_feedback" && qr.isCorrect === false).length :
                                  this.incorrectQuestionsIndices.length,
                accuracy: accuracy,
                timeSpent: timeTaken,
                questionResults: validQuestionResults,
                isDailyTest: this.isDailyTestMode,
                quizType: this.currentQuizMeta.quizType, // Store overall quiz type
                difficulty: this.currentQuizMeta.difficulty
            });
        }
    }

    startReviewIncorrect() {
        if (this.incorrectQuestionsIndices.length === 0) return;

        this.isReviewMode = true;
        this.currentIncorrectReviewIndex = 0; 

        this.quizContentArea.style.display = 'block';
        this.navigationControls.style.display = 'block';
        this.finalScoreContainer.style.display = 'none';
        this.progressBarContainer.style.display = 'none'; 
        this.submitBtn.style.display = 'none'; 

        this.displayQuestion(this.incorrectQuestionsIndices[this.currentIncorrectReviewIndex], true);
    }
  
    endReview() {
        this.isReviewMode = false;
        this.showFinalScore();
    }

    restart() {
        if (this.isAIDuelMode && window.aiDuelManager) {
            window.aiDuelManager.reset();
            this.isAIDuelMode = false; 
        }

        if (this.isDailyTestMode) {
            this.startDailyTest();
        } else if (this.currentQuizMeta) { // Check if there was a quiz to restart
            // Re-fetch or re-use existing quiz data based on currentQuizMeta
            // For simplicity, assuming we can restart with the same metadata and data.
            // If quizType was essay, it will restart as essay.
            this.quizTitle.textContent = this.currentQuizMeta.name;
            this.quizSubtitle.textContent = this.currentQuizMeta.description || "开始您的学习之旅！";
            this.initQuizState(); // This will reset state and call displayQuestion
        } else {
            console.warn("Restart called without active quiz metadata. Cannot restart.");
            this.close();
        }
    }

    addEditQuestionButton(questionBlock, questionIndex) {
        // 先移除可能存在的旧按钮容器，防止重复添加
        const existingEditButtonContainer = questionBlock.querySelector('.edit-question-btn-container');
        if (existingEditButtonContainer) existingEditButtonContainer.remove(); 

        const editButtonContainer = document.createElement('div');
        editButtonContainer.className = 'edit-question-btn-container';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn secondary edit-question-trigger-btn';
        editBtn.innerHTML = '✏️ 编辑此题';
        editBtn.title = '编辑当前题目内容';
        editBtn.onclick = (e) => {
            // 阻止事件冒泡，以防触发其他卡片点击事件
            e.stopPropagation(); 
            this.toggleQuestionEditMode(questionIndex, true);
        };
        
        editButtonContainer.appendChild(editBtn);

        // 将按钮容器添加到题目块的末尾
        questionBlock.appendChild(editButtonContainer);
    }
  
    toggleQuestionEditMode(questionIndex, enableEdit) {
        this.isEditingQuestion = enableEdit;
        const questionBlock = this.quizArea.querySelector('.question-block');
        if (!questionBlock) {
            console.error("toggleQuestionEditMode: Question block not found.");
            this.displayQuestion(questionIndex, this.isReviewMode); 
            return;
        }
        const questionData = this.currentQuizData[questionIndex];

        const existingControls = questionBlock.querySelector('.question-edit-controls');
        if (existingControls) existingControls.remove();
        const existingTriggerButtonContainer = questionBlock.querySelector('.edit-question-btn-container');
        if (existingTriggerButtonContainer) existingTriggerButtonContainer.remove();

        const optionsDiv = questionBlock.querySelector('.options');

        if (enableEdit) {
            const questionTextEl = questionBlock.querySelector('.question-text');
            const explanationContainer = questionBlock.querySelector('.explanation');

            if (questionTextEl) {
                const currentQuestionText = questionData.question;
                questionTextEl.innerHTML = `<textarea class="edit-field edit-question-text">${currentQuestionText}</textarea>`;
            }

            if (optionsDiv) {
                // For essay_ai_feedback, editing options might mean editing the "completion markers", which is unlikely.
                // Or it means editing the actual (hidden) content options if the essay question *had* multiple choice options as part of its structure.
                // Assuming standard MCQ editing for now. This part might need refinement if essay questions are editable.
                if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
                    optionsDiv.innerHTML = '<p><em>作文/AI反馈题型的"选项"通常是固定的完成标记，此处不提供编辑。请编辑题目正文和AI参考解析。</em></p>';
                } else {
                    optionsDiv.classList.add('options-editing');
                    optionsDiv.querySelectorAll('label').forEach(label => {
                        label.classList.remove('correct-answer-highlight', 'incorrect-user-choice', 'missed-correct-highlight', 'selected-option', 'answered-option', 'disabled-option');
                    });
                    const optionLabelsOriginal = Array.from(optionsDiv.querySelectorAll('label'));
                    optionLabelsOriginal.forEach((originalLabel, i) => {
                        const currentOptionText = questionData.options[i];
                        const inputContainer = document.createElement('div');
                        inputContainer.className = 'edit-option-item';
                        const isMulti = Array.isArray(questionData.correctAnswers);

                        const correctInput = document.createElement('input');
                        correctInput.type = isMulti ? 'checkbox' : 'radio';
                        correctInput.name = `edit_correct_q${questionIndex}`;
                        correctInput.className = 'edit-correct-answer-input';
                        correctInput.value = i; 
                        if (isMulti) { if (questionData.correctAnswers.includes(i)) correctInput.checked = true; }
                        else { if (questionData.correctAnswer === i) correctInput.checked = true; }
                        inputContainer.appendChild(correctInput);

                        const textInput = document.createElement('input');
                        textInput.type  = 'text';
                        textInput.className = 'edit-field edit-option-text';
                        textInput.value = currentOptionText;
                        inputContainer.appendChild(textInput);

                         if (originalLabel.parentNode === optionsDiv) { 
                            optionsDiv.replaceChild(inputContainer, originalLabel);
                         } else {
                            console.warn("Could not directly replace option label for editing. Appending instead. Original parent:", originalLabel.parentNode);
                            optionsDiv.appendChild(inputContainer);
                            if(originalLabel.parentNode) originalLabel.parentNode.removeChild(originalLabel); 
                         }
                    });
                }
            }

            if (explanationContainer) {
                const coreExplanationText = questionData.explanation || ""; 
                explanationContainer.innerHTML = `<strong>解析/AI参考：</strong><br><textarea class="edit-field edit-explanation-text">${coreExplanationText}</textarea>`;
            } else { // If no explanation div exists (e.g. question not answered yet), create one for editing
                const newExplanationContainer = document.createElement('div');
                newExplanationContainer.className = 'explanation'; // Keep class for consistency
                const coreExplanationText = questionData.explanation || "";
                newExplanationContainer.innerHTML = `<strong>解析/AI参考：</strong><br><textarea class="edit-field edit-explanation-text">${coreExplanationText}</textarea>`;
                if (optionsDiv) {
                    optionsDiv.insertAdjacentElement('afterend', newExplanationContainer);
                } else {
                    questionBlock.appendChild(newExplanationContainer);
                }
            }


            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'question-edit-controls';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'action-btn primary save-edit-btn';
            saveBtn.textContent = '💾 保存修改';
            saveBtn.onclick = () => this.saveQuestionChanges(questionIndex);
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'action-btn secondary cancel-edit-btn';
            cancelBtn.textContent = '❌ 取消';
            cancelBtn.onclick = () => this.toggleQuestionEditMode(questionIndex, false); 
            controlsDiv.appendChild(saveBtn);
            controlsDiv.appendChild(cancelBtn);
            questionBlock.appendChild(controlsDiv);

        } else { 
             if (optionsDiv) optionsDiv.classList.remove('options-editing');
            this.displayQuestion(questionIndex, this.isReviewMode);
        }
    }
  
    addOptionToEditMode(questionIndex) {
         const questionBlock = this.quizArea.querySelector('.question-block');
         if (!questionBlock) return;
         const optionsDiv = questionBlock.querySelector('.options-editing'); 
         if (!optionsDiv) return;
         if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
             alert("作文/AI反馈题型不适用此操作。");
             return;
         }

         const optionCount = optionsDiv.querySelectorAll('.edit-option-item').length;
         const isMulti = Array.isArray(this.currentQuizData[questionIndex]?.correctAnswers);

         const optionEditContainer = document.createElement('div');
         optionEditContainer.className = 'edit-option-item';

         const correctInput = document.createElement('input');
         correctInput.type = isMulti ? 'checkbox' : 'radio';
         correctInput.name = `edit_correct_q${questionIndex}`;
         correctInput.className = 'edit-correct-answer-input';
         correctInput.value = optionCount; 
         correctInput.id = `edit_correct_q${questionIndex}_opt${optionCount}`;

         const correctLabel = document.createElement('label'); 
         correctLabel.htmlFor = correctInput.id;
         correctLabel.className = isMulti ? 'custom-checkbox-edit' : 'custom-radio-edit'; 
         correctLabel.textContent = String.fromCharCode(65 + optionCount); 

         optionEditContainer.appendChild(correctInput);
         optionEditContainer.appendChild(correctLabel); 

         const textInput = document.createElement('input');
         textInput.type  = 'text';
         textInput.className = 'edit-field edit-option-text';
         textInput.placeholder = `选项 ${String.fromCharCode(65 + optionCount)}`;
         optionEditContainer.appendChild(textInput);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'action-btn minimal remove-option-btn'; 
          removeBtn.innerHTML = '🗑️';
          removeBtn.title = '删除此选项';
          removeBtn.onclick = (event) => {
              if (optionsDiv.querySelectorAll('.edit-option-item').length > 2) { 
                  event.target.closest('.edit-option-item').remove();
                   this.reindexEditOptions(questionIndex); 
              } else {
                  alert("错误：选项至少需要两项。");
              }
          };
         optionEditContainer.appendChild(removeBtn);

         const addOptionBtn = optionsDiv.querySelector('.add-option-btn'); 
         if (addOptionBtn) {
             optionsDiv.insertBefore(optionEditContainer, addOptionBtn);
         } else {
             optionsDiv.appendChild(optionEditContainer);
         }
         this.reindexEditOptions(questionIndex); 
    }
  
    reindexEditOptions(questionIndex) {
         const questionBlock = this.quizArea.querySelector('.question-block');
         if (!questionBlock) return;
         const optionItems = questionBlock.querySelectorAll('.edit-option-item');
         optionItems.forEach((item, i) => {
              const correctInput = item.querySelector('.edit-correct-answer-input');
              const correctLabel = item.querySelector('label'); 
              const textInput = item.querySelector('.edit-option-text');

              if (correctInput) {
                  correctInput.value = i; 
                  correctInput.id   = `edit_correct_q${questionIndex}_opt${i}`;
              }
              if (correctLabel && correctInput) { 
                  correctLabel.htmlFor = correctInput.id; 
                  correctLabel.textContent = String.fromCharCode(65 + i); 
              }
               if (textInput) { 
                   textInput.placeholder = `选项 ${String.fromCharCode(65 + i)}`;
               }
         });
    }
  
    async saveQuestionChanges(questionIndex) {
        const questionBlock = this.quizArea.querySelector('.question-block');
        if (!questionBlock) return;

        const originalQuestionData = this.currentQuizData[questionIndex];
        
        const editedData = {
            question: questionBlock.querySelector('.edit-question-text')?.value.trim() || originalQuestionData.question,
            options: [], // Will be populated for MCQ, might remain empty for essay if not editing options
            explanation: questionBlock.querySelector('.edit-explanation-text')?.value.trim() || originalQuestionData.explanation,
            section: originalQuestionData.section, 
            // Preserve quizType and other meta-fields from originalQuestionData
            quizType: originalQuestionData.quizType || "standard_mcq", 
        };
        
        let isMulti = Array.isArray(originalQuestionData.correctAnswers);
        if (this.currentQuizMeta && this.currentQuizMeta.quizType === "essay_ai_feedback") {
            // For essay, options are not directly edited here, correctAnswer/correctAnswers are not standard.
            // We are primarily saving question text and explanation.
            // The 'options' field in dataManager for essay type might store something else, or be unused for choices.
            // Let's assume options are not changed for essay_ai_feedback here.
            editedData.options = originalQuestionData.options; // Keep original options if any defined for essay structure
            // For essay, correctAnswer might be the model answer/guidance.
            // Let's assume this is updated via explanation field, and 'correctAnswer' field for essay is handled by dataManager.
            // Or, if the 'explanation' IS the model answer, then `questionData.correctAnswer` should store it.
            // For now, we only update the fields directly editable in the UI.
            // If `correctAnswer` for essay is meant to be the explanation, it should be:
            // editedData.correctAnswer = editedData.explanation;
        } else {
            // MCQ type
            if (isMulti) editedData.correctAnswers = [];
            else editedData.correctAnswer = null;

            const optionItems = questionBlock.querySelectorAll('.edit-option-item');
            optionItems.forEach((item, i) => {
                const optTextInput = item.querySelector('.edit-option-text');
                const correctInput = item.querySelector('.edit-correct-answer-input');
                editedData.options.push(optTextInput?.value.trim() || `选项 ${String.fromCharCode(65 + i)}`);
                if (correctInput && correctInput.checked) {
                    if (isMulti) editedData.correctAnswers.push(i);
                    else editedData.correctAnswer = i;
                }
            });
             // Validation for MCQ
            if (editedData.options.length < 2) { alert("错误：选项至少需要两项。"); return; }
            if (!isMulti && editedData.correctAnswer === null) { alert("错误：单选题必须指定一个正确答案。"); return; }
            if (isMulti && editedData.correctAnswers.length === 0) { alert("错误：多选题必须指定至少一个正确答案。"); return; }
            if (isMulti && editedData.correctAnswers.length === 1) {
                if (!confirm("这是一个多选题，但您只选择了一个正确答案。确定要这样保存吗？（多选题通常有多个正确答案）")) return;
            }
        }


        if (window.dataManager && this.currentQuizMeta && window.dataManager.getData) {
            const subjectId = (this.isDailyTestMode || this.isAIDuelMode) ? originalQuestionData.originalSubjectId : this.currentQuizMeta.subjectId;
            const periodId = this.currentQuizMeta.periodId; // This is generic for daily/duel
            const quizId = (this.isDailyTestMode || this.isAIDuelMode) ? originalQuestionData.quizId : this.currentQuizMeta.id; // Need quizId from original question for daily/duel
            
            let actualQuestionIndexInQuizFile = questionIndex;
            if (this.isDailyTestMode || this.isAIDuelMode) {
                actualQuestionIndexInQuizFile = originalQuestionData.originalIndexInQuizFile;
            }


            try {
                const updateSuccess = await window.dataManager.updateQuestion(
                    subjectId, 
                    periodId, 
                    quizId, 
                    actualQuestionIndexInQuizFile, // Use original index for dataManager
                    editedData
                );
                if (updateSuccess) {
                    // Update local quizEngine's copy of this question
                    this.currentQuizData[questionIndex] = { ...originalQuestionData, ...editedData };
                    
                    alert('题目修改已保存！');
                    if (this.questionResults[questionIndex]) {
                       this.questionResults[questionIndex].question = editedData.question;
                       this.questionResults[questionIndex].options = editedData.options;
                       this.questionResults[questionIndex].explanation = editedData.explanation;
                        if (this.currentQuizMeta.quizType !== "essay_ai_feedback") {
                            if (isMulti) this.questionResults[questionIndex].correctAnswer = editedData.correctAnswers;
                            else this.questionResults[questionIndex].correctAnswer = editedData.correctAnswer;
                        }
                        // For essay, questionResults.correctAnswer might point to the model answer.
                    }
                } else {
                     alert("错误：题目更新失败，但数据管理器未抛出错误。");
                }
            } catch (err) {
                console.error("保存题目修改失败:", err);
                alert("保存修改失败，请重试。错误详情请查看控制台: " + err.message);
                return; 
            }
        } else {
            alert("错误：数据管理器不可用或题库元数据丢失，无法保存修改。");
            console.error("DataManager or quiz metadata missing/invalid for saving:", {windowDataManager: !!window.dataManager, currentQuizMeta: this.currentQuizMeta});
            return;
        }
        this.toggleQuestionEditMode(questionIndex, false); 
    }
}
  
window.quizEngine = new QuizEngine();