// js/ui-manager.js

class UIManager {
    constructor() {
        this.currentState = {
            level: 'home', // 'home', 'subject', 'period'
            currentTab: 'subjects', // 'subjects', 'review', 'statistics'
            subject: null,
            period: null
        };
        this.initialized = false;

        // DOM元素引用
        this.breadcrumb = document.getElementById('breadcrumb');
        this.cardsGrid = document.getElementById('cardsGrid');
        this.mainNavigation = document.getElementById('mainNavigation');
        this.tabContents = {
            subjects: document.getElementById('subjectsTab'),
            review: document.getElementById('reviewTab'),
            statistics: document.getElementById('statisticsTab')
        };
        this.dailyTestBtn = document.getElementById('dailyTestBtn');

        // NEW: Left Sidebar elements
        this.leftSidebar = document.getElementById('leftSidebar');
        this.leftSidebarToggle = document.getElementById('leftSidebarToggle');
        this.sidebarTabs = document.querySelectorAll('.sidebar-tab');
        this.aiChatSection = document.getElementById('aiChatSection');
        this.adminPanelSection = document.getElementById('adminPanelSection');
        this.sidebarSections = {
            'ai-chat': this.aiChatSection,
            'admin-panel': this.adminPanelSection
        };
        this.currentLeftSidebarTab = 'ai-chat'; // Default active tab in sidebar

        // New: AI Chat related elements (formerly aiDiagnosticDialog)
        this.aiChatDisplayElement = document.getElementById('aiChatDisplay');
        this.aiChatSendBtnElement = document.getElementById('aiChatSendBtn');
        this.aiChatInputElement = document.getElementById('aiChatInput');
        this.aiChatLoadingElement = document.getElementById('aiChatLoading');
        this.aiChatNewChatBtnElement = document.getElementById('aiChatNewChatBtn');
        this.aiChatAbortBtnElement = document.getElementById('aiChatAbortBtn');
        this.aiChatModeBtns = document.querySelectorAll('.ai-chat-mode-btn');


        // Initialization
        this.setupEventListeners();
    }

    /**
     * 初始化UI管理器 (应在App模块中调用)
     */
    init() {
        if (this.initialized) return;

        this.navigateToLevel('home');
        this.switchTab(this.currentState.currentTab, true); // true to force load content
        this.initLeftSidebar(); // Initialize left sidebar specific elements and listeners
        this.initialized = true;
        console.log('✅ UIManager initialized.');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (this.breadcrumb) {
            this.breadcrumb.addEventListener('click', (e) => {
                const item = e.target.closest('.breadcrumb-item');
                if (!item || item.classList.contains('current')) return;

                const level = item.dataset.level;
                const data = { ...item.dataset }; // Extract all data attributes
                this.navigateToLevel(level, data);
            });
        }

        if (this.mainNavigation) {
            this.mainNavigation.addEventListener('click', (e) => {
                const tabButton = e.target.closest('.nav-tab');
                if (tabButton && !tabButton.classList.contains('active')) {
                    this.switchTab(tabButton.dataset.tab);
                }
            });
        }

        // Event listener for the Daily Test Button
        if (this.dailyTestBtn) {
            this.dailyTestBtn.addEventListener('click', () => {
                if (window.quizEngine && typeof window.quizEngine.startDailyTest === 'function') {
                    window.quizEngine.startDailyTest();
                } else {
                    console.error('QuizEngine or startDailyTest method not available.');
                    alert('每日一测功能暂时无法使用，请稍后再试。');
                }
            });
        }

        // 监听由 APIMetricsManager 派发的自定义事件并更新DOM
        document.addEventListener('apiMetricsUpdated', (event) => {
            const detail = event.detail;

            const todayUsedEl = document.getElementById('apiTodayUsed');
            const todayRemainingEl = document.getElementById('apiTodayRemaining');
            const progressBarEl = document.getElementById('apiTodayProgressBar');
            const totalCallsEl = document.getElementById('apiTotalCalls');
            const todayTokensEl = document.getElementById('apiTokensToday');
            const totalTokensEl = document.getElementById('apiTokensTotal');

            if (todayUsedEl) todayUsedEl.textContent = detail.todayUsed;
            if (todayRemainingEl) todayRemainingEl.textContent = detail.todayRemaining;
            if (totalCallsEl) totalCallsEl.textContent = detail.totalCalls;

            if (todayTokensEl) {
                todayTokensEl.textContent = detail.todayTokens;
            } else {
                console.warn("Element with ID 'apiTokensToday' not found for UI update.");
            }
            if (totalTokensEl) {
                totalTokensEl.textContent = detail.totalTokens;
            } else {
                console.warn("Element with ID 'apiTokensTotal' not found for UI update.");
            }

            if (progressBarEl) {
                const percent = detail.todayProgressPercent;
                progressBarEl.style.width = `${percent}%`;
                // progressBarEl.textContent = `${Math.round(percent)}%`; // 可选：在进度条上显示百分比

                // 更新进度条颜色 (可选)
                progressBarEl.classList.remove('low-usage', 'medium-usage', 'high-usage');
                if (percent >= 90) {
                    progressBarEl.classList.add('high-usage');
                } else if (percent >= 70) {
                    progressBarEl.classList.add('medium-usage');
                } else {
                    progressBarEl.classList.add('low-usage');
                }
            }
        });
    }

    /**
     * 初始化左侧侧边栏的DOM元素和事件监听器
     */
    initLeftSidebar() {
        if (!this.leftSidebar || !this.leftSidebarToggle || !this.aiChatSection || !this.adminPanelSection) {
            console.error("UIManager: Left Sidebar critical elements not found. AI Chat/Admin Panel features might not work.");
            return;
        }

        // 绑定侧边栏内部 Tab 切换
        this.sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchLeftSidebarTab(tab.dataset.tab));
        });

        // Initialize AI Chat Manager callbacks (now using the new AiChatManager)
        if (window.aiChatManager) {
            const aiCallbacks = {
                displayMessage: (role, text, isStreaming, append, isFinalRender, isPlaceholder) =>
                    this._displayAIChatMessage(role, text, isStreaming, append, isFinalRender, isPlaceholder),
                clearChat: () => this._clearAIChat(),
                setLoadingState: (isLoading) => this._setAIChatLoadingState(isLoading),
                setInputText: (text) => this._setAIChatInputText(text),
                setModeButtonActive: (mode) => this._setAIChatModeButtonActive(mode)
            };
            if (!window.aiChatManager.initialized) { // Prevent multiple init calls
                window.aiChatManager.init(aiCallbacks, () => this._getStudyReportJsonString());
            }
        } else {
            console.error("UIManager: AiChatManager (formerly AiDiagnosticManager) not available. AI features will be limited.");
        }

        // Bind AI Chat specific internal buttons
        this.aiChatModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.activateAIChatMode(mode);
            });
        });

        // Dynamic textarea height for AI Chat input
        if (this.aiChatInputElement) {
            this.aiChatInputElement.addEventListener('input', () => {
                 this._adjustTextareaHeight(this.aiChatInputElement);
            });
        }
        // Send button and Enter key for AI Chat input
        if (this.aiChatSendBtnElement && this.aiChatInputElement) {
            const sendMessageHandler = () => {
                if (window.aiChatManager) {
                    const userText = this.aiChatInputElement.value.trim();
                    if (userText) {
                        window.aiChatManager.sendMessage(userText);
                        this.aiChatInputElement.value = '';
                        this._adjustTextareaHeight(this.aiChatInputElement);
                    }
                }
            };
            this.aiChatSendBtnElement.addEventListener('click', sendMessageHandler);
            this.aiChatInputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageHandler();
                }
            });
        }

        if (this.aiChatNewChatBtnElement) {
            this.aiChatNewChatBtnElement.addEventListener('click', () => {
                if (window.aiChatManager) {
                    if (window.aiChatManager.isWaitingForAIResponse) {
                        this.showToast("请等待当前AI响应完成后再开始新对话。", "info");
                        return;
                    }
                    this.activateAIChatMode('general'); // Reset to general mode for new chat
                    window.aiChatManager.startNewChat();
                }
            });
        }

        if (this.aiChatAbortBtnElement) {
            this.aiChatAbortBtnElement.addEventListener('click', () => {
                if (window.aiChatManager) {
                    window.aiChatManager.abortAIResponse();
                }
            });
        }
        console.log("UIManager: Left Sidebar and AI Chat elements initialized and event listeners bound.");
    }

    /**
     * 激活AI聊天模式 (通用，诊断，提示，解析)
     * @param {string} mode - 'general', 'diagnose', 'hint', 'explain'
     * @param {object} [data] - 题目数据等上下文信息
     */
    activateAIChatMode(mode, data = null) {
        if (!window.aiChatManager) {
            this.showToast("AI助手模块未加载。", "error");
            console.error("UIManager: AiChatManager not available for activating mode.");
            return;
        }

        // Check if AI config is valid before proceeding
        const aiConfig = window.AppConfig?.APP_CONFIG?.ai;
        if (!aiConfig || !aiConfig.key || aiConfig.key === 'YOUR_deepseek_API_KEY' || !aiConfig.model || !aiConfig.baseUrl) {
            this.showToast("AI助手功能配置不完整或API Key无效，请在应用配置中检查。", "error", 7000);
            console.error("UIManager: AI configuration invalid. Key:", aiConfig?.key, "Model:", aiConfig?.model);
            return;
        }

        this.toggleLeftSidebar(true); // Ensure sidebar is open
        this.switchLeftSidebarTab('ai-chat'); // Ensure AI Chat tab is active

        if (window.aiChatManager.isWaitingForAIResponse) {
            this.showToast("AI正在思考中，请等待当前响应完成后再切换模式或开始新对话。", "info");
            return;
        }
        
        // Let AiChatManager handle the prompt preparation and mode activation
        window.aiChatManager.preparePrompt(mode, data);
        if (this.aiChatInputElement) this.aiChatInputElement.focus();
    }

    /**
     * 控制左侧侧边栏的显示/隐藏
     * @param {boolean} [show] - true 显示, false 隐藏. 如果未提供，则切换状态.
     */
    toggleLeftSidebar(show) {
        if (!this.leftSidebar) return;
        const shouldShow = typeof show === 'boolean' ? show : !this.leftSidebar.classList.contains('active');
        
        this.leftSidebar.classList.toggle('active', shouldShow);
        // NEW: Toggle class on <html> to drive main content shifting
        document.documentElement.classList.toggle('sidebar-active', shouldShow);

        // Update toggle button icon
        if (this.leftSidebarToggle) {
            this.leftSidebarToggle.querySelector('.arrow-icon').textContent = shouldShow ? '◀' : '▶';
        }

        // Manage body overflow for modal effect (only for true overlays)
        this._updateBodyOverflow();
    }

    /**
     * Helper to update body overflow based on all open UI elements
     * IMPORTANT: Left sidebar itself no longer causes `modal-open` as it shifts content.
     */
    _updateBodyOverflow() {
        const isQuizOpen = window.quizEngine?.quizContainer?.style.display === 'block';
        const isReviewOpen = window.reviewManager?.reviewContainer?.style.display === 'block';
        const isAiUploadModalOpen = window.adminManager?.aiUploadModal?.classList.contains('active');
        const isAiDuelSubjectModalOpen = window.app?.aiDuelSubjectModal?.classList.contains('active');

        // `body.modal-open` should only be set if one of the *overlaying* modals is open
        if (isQuizOpen || isReviewOpen || isAiUploadModalOpen || isAiDuelSubjectModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }


    /**
     * 切换左侧侧边栏内部的Tab (AI助手 / 管理)
     * @param {string} tabId - 'ai-chat' 或 'admin-panel'
     */
    switchLeftSidebarTab(tabId) {
        if (!this.sidebarSections[tabId]) {
            console.error(`Left sidebar tab content for "${tabId}" not found.`);
            return;
        }

        if (this.currentLeftSidebarTab === tabId) {
            return; // Already on this tab
        }

        this.currentLeftSidebarTab = tabId;

        // Update tab buttons active state
        this.sidebarTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update section content visibility
        Object.values(this.sidebarSections).forEach(content => {
            if (content) content.classList.remove('active');
        });
        this.sidebarSections[tabId].classList.add('active');

        // Special handling for Admin Panel tab
        if (tabId === 'admin-panel' && window.adminManager && typeof window.adminManager.refreshPanelContent === 'function') {
            window.adminManager.refreshPanelContent();
        }
        if (tabId === 'ai-chat' && window.aiChatManager && typeof window.aiChatManager.focusInput === 'function') {
            window.aiChatManager.focusInput();
        }
    }

    /**
     * 切换主导航标签页
     */
    switchTab(tabId, forceLoad = false) {
        if (!this.tabContents[tabId]) {
            console.error(`Tab content for "${tabId}" not found.`);
            return;
        }

        if (this.currentState.currentTab === tabId && !forceLoad) {
            return;
        }

        this.currentState.currentTab = tabId;

        if (this.mainNavigation) {
            this.mainNavigation.querySelectorAll('.nav-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
        }

        Object.values(this.tabContents).forEach(content => {
            if(content) content.classList.remove('active');
        });
        if(this.tabContents[tabId]) this.tabContents[tabId].classList.add('active');

        this.loadTabContent(tabId);
    }

    /**
     * 加载特定标签页的内容
     */
    loadTabContent(tabId) {
        switch (tabId) {
            case 'subjects':
                this.refreshCurrentPage();
                break;
            case 'review':
                if (window.reviewManager && typeof window.reviewManager.initReviewPage === 'function') {
                    window.reviewManager.initReviewPage();
                } else {
                    console.warn('ReviewManager or initReviewPage not available.');
                    if (this.tabContents.review) this.tabContents.review.innerHTML = '<p style="padding:20px; text-align:center;">错题回顾模块加载失败。</p>';
                }
                break;
            case 'statistics':
                if (window.statisticsManager && typeof window.statisticsManager.initStatisticsPage === 'function') {
                    window.statisticsManager.initStatisticsPage();
                } else {
                    console.warn('StatisticsManager or initStatisticsPage not available.');
                    if (this.tabContents.statistics) this.tabContents.statistics.innerHTML = '<p style="padding:20px; text-align:center;">学习统计模块加载失败。</p>';
                }
                break;
        }
    }


    /**
     * 导航到指定层级 (题库选择)
     */
    navigateToLevel(level, data = {}) {
        if (this.currentState.currentTab !== 'subjects') {
             this.switchTab('subjects', true);
        }

        let subjectValid = true;
        let periodValid = true;

        if (level === 'subject' || level === 'period') {
            subjectValid = this.validateSubjectExists(data.subject);
            if (!subjectValid) {
                console.warn(`Attempted to navigate to non-existent subject ID: ${data.subject}`);
                level = 'home'; // Fallback to home
            }
        }
        if (level === 'period') {
            periodValid = this.validatePeriodExists(data.subject, data.period);
            if (!periodValid) {
                console.warn(`Attempted to navigate to non-existent period ID: ${data.period} in subject: ${data.subject}`);
                level = 'subject'; // Fallback to subject level
                // data.period will be ignored or should be nulled
            }
        }


        switch (level) {
            case 'home':
                this.currentState.level = 'home';
                this.currentState.subject = null;
                this.currentState.period = null;
                this.showHomePage();
                break;
            case 'subject':
                this.currentState.level = 'subject';
                this.currentState.subject = data.subject;
                this.currentState.period = null; // Ensure period is nulled when going to subject level
                this.showSubjectPage(data.subject);
                break;
            case 'period':
                // Subject and period are already validated above
                this.currentState.level = 'period';
                this.currentState.subject = data.subject;
                this.currentState.period = data.period;
                this.showPeriodPage(data.subject, data.period);
                break;
        }
        this.updateBreadcrumb();
    }

    validateSubjectExists(subjectId) {
        return window.dataManager && window.dataManager.getData() && window.dataManager.getData()[subjectId];
    }

    validatePeriodExists(subjectId, periodId) {
        return window.dataManager && window.dataManager.getData() && window.dataManager.getData()[subjectId]?.periods[periodId];
    }

    showHomePage() {
        if (!window.dataManager || !this.cardsGrid || !window.AppConfig?.DEFAULT_INITIAL_QUIZ_DATA) {
            this.showEmptyState('数据或配置加载中...', '请稍候。');
            return;
        }
        const allQuizData = window.dataManager.getData();
        if (!allQuizData || Object.keys(allQuizData).length === 0) {
            this.showEmptyState('暂无学科数据', '请检查数据配置或通过管理面板添加。');
            return;
        }

        const orderedSubjectIds = Object.keys(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA);

        const subjectsWithContent = orderedSubjectIds
            .map(id => allQuizData[id])
            .filter(subject => {
                if (!subject) {
                    return false;
                }
                return subject.periods &&
                       Object.values(subject.periods).some(period => period.quizzes && period.quizzes.length > 0);
            });

        if (subjectsWithContent.length === 0) {
            this.showEmptyState('暂无题库', '点击左侧 ⚙️ 按钮添加您的第一个题库吧！');
            return;
        }
        this.cardsGrid.innerHTML = subjectsWithContent.map(subject => this.createSubjectCard(subject)).join('');
    }

    createSubjectCard(subject) {
        // 新增：计算该章下的总题目数
        const totalQuestions = Object.values(subject.periods || {})
            .reduce((sum, period) => {
                const periodQuestions = (period.quizzes || [])
                    .reduce((quizSum, quiz) => quizSum + (quiz.questions ? quiz.questions.length : 0), 0);
                return sum + periodQuestions;
            }, 0);
            
        const nonEmptyPeriodsCount = Object.values(subject.periods || {})
            .filter(p => p.quizzes && p.quizzes.length > 0).length;

        return `
            <div class="card" onclick="window.uiManager.navigateToLevel('subject', { subject: '${subject.id}' })" role="button" tabindex="0" aria-label="选择章节 ${subject.name}">
                <div class="card-icon">${subject.icon || '📚'}</div>
                <h3>${subject.name}</h3>
                <p>${subject.description || '点击查看详情'}</p>
                <div class="card-meta">
                    <span>${nonEmptyPeriodsCount} 个小节</span>
                    <span>${totalQuestions} 道题目</span>
                </div>
            </div>
        `;
    }

    showSubjectPage(subjectId) {
        if (!window.dataManager || !this.cardsGrid) return;
        const allQuizData = window.dataManager.getData();
        const subject = allQuizData[subjectId];

        if (!subject) {
            console.error(`Subject with ID "${subjectId}" not found for display.`);
            this.navigateToLevel('home'); // Fallback
            return;
        }

        // --- START OF CORRECTION ---
        // 1. 获取权威的时期定义列表 (包含新的详细描述)
        const orderedPeriodOptions = window.dataManager.getPeriodOptions(subjectId);
        if (!orderedPeriodOptions || orderedPeriodOptions.length === 0) {
            this.showEmptyState(`"${subject.name}"学科下没有预设的分类。`, '请检查配置或添加题库。');
            return;
        }

        // 2. 获取包含题库的实时数据
        const livePeriodsData = subject.periods || {};

        // 3. 【修正的核心逻辑】遍历权威定义，并结合实时数据判断是否显示
        const periodsWithContent = orderedPeriodOptions
            .map(periodOption => { // periodOption 是来自配置文件的完整对象 {id, name, description, ...}
                const livePeriodData = livePeriodsData[periodOption.id]; // 从实时数据中查找对应的时期

                // 只有当这个时期在实时数据中存在，并且包含题库时，才认为它有内容
                if (livePeriodData && livePeriodData.quizzes && livePeriodData.quizzes.length > 0) {
                    // 创建一个用于显示的新对象，关键是使用配置中的描述
                    return {
                        id: periodOption.id,
                        name: periodOption.name,
                        description: periodOption.description, // <-- 使用配置文件中的新描述！
                        icon: periodOption.icon || livePeriodData.icon || '📂', // 优先用配置文件的图标
                        quizzes: livePeriodData.quizzes // 从实时数据中获取题库信息
                    };
                }
                
                // 如果没有实时数据或没有题库，返回 null，后续会被过滤掉
                return null;
            })
            .filter(period => period !== null); // 过滤掉没有内容的时期
        // --- END OF CORRECTION ---

        if (periodsWithContent.length === 0) {
            this.showEmptyState(`"${subject.name}"学科下暂无分类或题库`, '点击左侧 ⚙️ 按钮添加题库！');
            return;
        }
        this.cardsGrid.innerHTML = periodsWithContent.map(period => this.createPeriodCard(period, subjectId)).join('');
    }

    createPeriodCard(period, subjectId) {
        // 新增：计算该节下的总题目数
        const totalQuestions = (period.quizzes || [])
            .reduce((sum, quiz) => sum + (quiz.questions ? quiz.questions.length : 0), 0);

        return `
            <div class="card" onclick="window.uiManager.navigateToPeriod('${subjectId}', '${period.id}')" role="button" tabindex="0" aria-label="选择小节 ${period.name}">
                <div class="card-icon">${period.icon || '📂'}</div>
                <h3>${period.name}</h3>
                <p>${period.description || '点击查看题库'}</p>
                <div class="card-meta">
                    <span>${totalQuestions} 道题目</span>
                    <span>→</span>
                </div>
            </div>
        `;
    }

    showPeriodPage(subjectId, periodId) {
        if (!window.dataManager || !this.cardsGrid) return;
        const allQuizData = window.dataManager.getData();
        const period = allQuizData[subjectId]?.periods[periodId];

        if (!period || !period.quizzes || period.quizzes.length === 0) {
            console.warn(`Period ID "${periodId}" in subject "${subjectId}" has no quizzes or not found. Navigating up.`);
            this.navigateToLevel('subject', { subject: subjectId }); // Fallback to parent subject
            return;
        }
        this.cardsGrid.innerHTML = period.quizzes.map(quiz => this.createQuizCard(quiz, subjectId, periodId)).join('');
    }

    createQuizCard(quiz, subjectId, periodId) {
        const difficultyConfig = (window.AppConfig && window.AppConfig.APP_CONFIG && window.AppConfig.APP_CONFIG.difficulty[quiz.difficulty]) ||
                               { name: quiz.difficulty || '未知', icon: '⚪', color: '#999' }; // Fallback if config missing
        return `
            <div class="card" onclick="window.uiManager.startQuiz('${subjectId}', '${periodId}', '${quiz.id}')" role="button" tabindex="0" aria-label="开始测试 ${quiz.name}">
                <div class="card-actions">
                    <button class="card-delete-btn" 
                            onclick="event.stopPropagation(); window.adminManager.deleteQuiz('${subjectId}', '${periodId}', '${quiz.id}')" 
                            title="删除此题库">
                        🗑️
                    </button>
                </div>
                <div class="card-icon">${difficultyConfig.icon}</div>
                <h3>${quiz.name}</h3>
                <p>${quiz.description || '暂无描述'}</p>
                <div class="card-meta">
                    <span class="difficulty-badge difficulty-${quiz.difficulty || 'unknown'}">
                        ${difficultyConfig.name}
                    </span>
                    <span>${quiz.questions?.length || 0} 题</span>
                </div>
                <div style="margin-top: 20px;">
                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
                        预计用时: ${quiz.estimatedTime || "未知"}
                    </div>
                    <button class="start-quiz-btn" aria-label="开始测试 ${quiz.name}">
                        <span>开始测试</span>
                        <span>▶</span>
                    </button>
                </div>
            </div>
        `;
    }

    showEmptyState(title, description) {
        if (this.cardsGrid) {
            this.cardsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 20px; background: rgba(255,255,255,0.8); border-radius: var(--border-radius-md);">
                    <h3>${title}</h3>
                    <p>${description}</p>
                </div>
            `;
        }
    }

    updateBreadcrumb() {
        if (!this.breadcrumb || !window.dataManager) return;

        let items = [
            { level: 'home', text: '🏠 首页', data: {} }
        ];
        const allQuizData = window.dataManager.getData();
        if (!allQuizData) { // If dataManager isn't fully ready or data is corrupt
             this.breadcrumb.innerHTML = this.createBreadcrumbItem(items[0], 0, 1);
             return;
        }


        if (this.currentState.subject && allQuizData[this.currentState.subject]) {
            const subject = allQuizData[this.currentState.subject];
            items.push({
                level: 'subject',
                text: `${subject.icon || '📚'} ${subject.name}`,
                data: { subject: this.currentState.subject }
            });
        }

        if (this.currentState.period && this.currentState.subject && allQuizData[this.currentState.subject]?.periods[this.currentState.period]) {
            const period = allQuizData[this.currentState.subject].periods[this.currentState.period];
            items.push({
                level: 'period',
                text: `${period.icon || '📂'} ${period.name}`,
                data: { subject: this.currentState.subject, period: this.currentState.period }
            });
        }
        this.breadcrumb.innerHTML = items.map((item, index) => this.createBreadcrumbItem(item, index, items.length)).join('');
    }

    createBreadcrumbItem(item, index, totalItems) {
        const isCurrent = item.level === this.currentState.level; // Simplified current check
        let dataAttrs = '';
        for (const key in item.data) {
            // Ensure data attribute values are not null/undefined before adding
            if (item.data.hasOwnProperty(key) && item.data[key] !== null && item.data[key] !== undefined) {
                dataAttrs += `data-${key}="${item.data[key]}" `;
            }
        }
        const ariaCurrent = isCurrent ? 'aria-current="page"' : '';
        const tabIndex = isCurrent ? '-1' : '0'; // Make current non-interactive, others focusable

        const breadcrumbItemHTML = `
            <div class="breadcrumb-item ${isCurrent ? 'current' : ''}"
                 data-level="${item.level}"
                 ${dataAttrs.trim()}
                 ${ariaCurrent}
                 role="link"
                 tabindex="${tabIndex}"
                 aria-label="${isCurrent ? item.text + ', 当前页面' : '导航到 ' + item.text}">
                ${item.text}
            </div>
        `;
        const separator = index < totalItems - 1 ? '<span class="breadcrumb-separator" aria-hidden="true">›</span>' : '';
        return breadcrumbItemHTML + separator;
    }

    refreshCurrentPage() {
        if (this.currentState.currentTab === 'subjects') {
            if (!window.dataManager) {
                this.showEmptyState('数据管理器未加载。', '请稍后再试。');
                return;
            }
            const allQuizData = window.dataManager.getData();
             if (!allQuizData) {
                this.showEmptyState('题库数据为空或加载失败。', '请检查配置。');
                return;
            }

            const { level, subject, period } = this.currentState;

            if (level === 'period' && subject && period) {
                const periodData = allQuizData[subject]?.periods[period];
                if (periodData && periodData.quizzes && periodData.quizzes.length > 0) {
                    this.showPeriodPage(subject, period);
                } else { // Period empty or non-existent, go up to subject
                    this.navigateToLevel('subject', { subject: subject });
                }
            } else if (level === 'subject' && subject) {
                const subjectData = allQuizData[subject];
                const subjectHasContent = subjectData && subjectData.periods &&
                                        Object.values(subjectData.periods)
                                              .some(p => p.quizzes && p.quizzes.length > 0);
                if (subjectHasContent) {
                    this.showSubjectPage(subject);
                } else { // Subject empty or non-existent, go to home
                    this.navigateToLevel('home');
                }
            } else { // Default to home
                this.showHomePage();
            }
            this.updateBreadcrumb();
        } else {
            this.loadTabContent(this.currentState.currentTab);
        }
    }

    navigateToSubject(subjectId) {
        this.navigateToLevel('subject', { subject: subjectId });
    }

    navigateToPeriod(subjectId, periodId) {
        this.navigateToLevel('period', { subject: subjectId, period: periodId });
    }

    startQuiz(subjectId, periodId, quizId) {
        if (window.quizEngine && typeof window.quizEngine.start === 'function') {
            window.quizEngine.start(subjectId, periodId, quizId);
        } else {
            console.error("QuizEngine or start method not available.");
            alert("无法开始测试，题库引擎加载失败。");
        }
    }

    /**
     * 显示一个简单的toast消息
     * @param {string} message - 要显示的消息
     * @param {'info'|'success'|'error'|'warning'} type - 消息类型
     * @param {number} duration - 显示时长 (毫秒)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toastId = 'appToastMessage';
        let toast = document.getElementById(toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = toastId;
            // Basic styling, can be enhanced in CSS
            toast.style.position = 'fixed';
            toast.style.bottom = '20px'; // Initial position before animation
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '8px';
            toast.style.color = 'white';
            toast.style.fontSize = '0.9rem';
            toast.style.zIndex = '9999'; // Keep high z-index for when visible
            toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease, bottom 0.3s ease';

            // Set pointer-events to none initially
            toast.style.pointerEvents = 'none';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.backgroundColor = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)';


        // Clear previous timeout if any
        if (toast.currentTimeout) {
            clearTimeout(toast.currentTimeout);
        }

        // Control pointer-events during visibility changes
        toast.style.pointerEvents = 'auto'; // Make it clickable when visible

        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '30px'; // Animate to visible position
        }, 10);


        // Fade out and disable pointer events
        toast.currentTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px'; // Animate back to initial hidden position
            // Disable pointer-events after fade out
            toast.style.pointerEvents = 'none';
        }, duration);
    }

    // Example method for achievement popups (if UIManager handles them directly)
    displayAchievementNotification(achievements) {
        // This is just a placeholder. A real implementation would involve a styled modal or notification.
        achievements.forEach(ach => {
            this.showToast(`🏆 新成就: ${ach.name}!`, 'success', 5000);
        });
    }

    // --- AI Chat Manager UI Callbacks Implementation ---
    _adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto'; // 重置高度以获取正确的scrollHeight
        let scrollHeight = textarea.scrollHeight;
        const maxHeight = 120; // 与CSS中的max-height保持一致
        if (scrollHeight > maxHeight) {
            textarea.style.height = maxHeight + 'px';
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.height = scrollHeight + 'px';
            textarea.style.overflowY = 'hidden'; // 如果内容不足，隐藏滚动条
        }
    }


    _getStudyReportJsonString() {
        if (window.statisticsManager && typeof window.statisticsManager.getLatestReportDataForAI === 'function') {
            const reportObject = window.statisticsManager.getLatestReportDataForAI();
            if (reportObject) {
                try {
                    return JSON.stringify(reportObject, null, 2); // 使用2个空格缩进，便于调试时阅读
                } catch (e) {
                    console.error("UIManager: Error stringifying study report for AI:", e);
                    this.showToast("准备学习报告数据时出错。", "error");
                    return null;
                }
            } else {
                this.showToast("未能获取学习报告数据（可能统计模块未就绪或无数据）。", "warning");
            }
        } else {
            console.warn("UIManager: statisticsManager.getLatestReportDataForAI not available.");
            this.showToast("统计模块无法提供报告数据。", "error");
        }
        return null;
    }

    _displayAIChatMessage(role, textOrHtml, isStreaming, append = false, isFinalRender = false, isPlaceholder = false) {
        if (!this.aiChatDisplayElement) {
            console.error("UIManager: AI Chat display element not found for displaying message.");
            return;
        }
        const chatDisplay = this.aiChatDisplayElement;
        const thinkingMessageText = "AI正在思考中...";
        const textSpanSelector = '.message-text';

        let targetMessageElement = null;
        // 尝试找到最后一个AI消息元素
        const assistantMessages = chatDisplay.querySelectorAll('.assistant-message');
        if (assistantMessages.length > 0) {
            targetMessageElement = assistantMessages[assistantMessages.length - 1];
        }

        // 1. 处理占位符 "AI正在思考中..."
        if (isPlaceholder && role === 'assistant') {
            // 如果最后一个AI消息已经是占位符，则不重复创建
            if (targetMessageElement && targetMessageElement.dataset.isPlaceholder === 'true') {
                return;
            }
            // 清理可能存在的旧的流式或占位符标记的消息
            if (targetMessageElement && (targetMessageElement.dataset.isStreaming === 'true' || targetMessageElement.dataset.isPlaceholder === 'true')) {
                targetMessageElement.remove(); // 移除旧的，下面会创建新的占位符
            }
            const newPlaceholderMsg = this._createNewAIChatMessageElement(role, thinkingMessageText, chatDisplay, false);
            newPlaceholderMsg.dataset.isPlaceholder = 'true';
        }
        // 2. 处理流式输出 - 第一个有效块 (替换占位符)
        else if (isStreaming && !append && role === 'assistant') {
            if (targetMessageElement && targetMessageElement.dataset.isPlaceholder === 'true') {
                // 找到了占位符，用第一个chunk替换其内容
                const textSpan = targetMessageElement.querySelector(textSpanSelector);
                if (textSpan) textSpan.textContent = textOrHtml; // 设置纯文本
                delete targetMessageElement.dataset.isPlaceholder; // 清除占位符标记
                targetMessageElement.dataset.isStreaming = 'true';   // 标记为正在流式输出
            } else if (targetMessageElement && targetMessageElement.dataset.isStreaming === 'true') {
                // 如果最后一个AI消息已经在流式输出了 (例如AI快速发送了空chunk后的第一个有效chunk)
                const textSpan = targetMessageElement.querySelector(textSpanSelector);
                if (textSpan) textSpan.textContent = textOrHtml;
            }
             else {
                // 没有占位符，也没有正在流式的AI消息，则创建一个新的流式消息
                const newStreamingMsg = this._createNewAIChatMessageElement(role, textOrHtml, chatDisplay, false);
                newStreamingMsg.dataset.isStreaming = 'true';
            }
        }
        // 3. 处理流式输出 - 后续追加块
        else if (isStreaming && append && role === 'assistant') {
            if (targetMessageElement && targetMessageElement.dataset.isStreaming === 'true') {
                const textSpan = targetMessageElement.querySelector(textSpanSelector);
                if (textSpan) textSpan.textContent += textOrHtml; // 追加纯文本
            } else {
                // 理论上不应该发生：试图追加到非流式消息上。
                console.warn("UIManager: append stream to non-streaming AI message. Creating new.");
                const newStreamingMsg = this._createNewAIChatMessageElement(role, textOrHtml, chatDisplay, false);
                newStreamingMsg.dataset.isStreaming = 'true';
            }
        }
        // 4. 处理最终渲染 (用Markdown渲染后的HTML替换)
        else if (isFinalRender && role === 'assistant') {
            // 目标是替换掉最后一个AI消息（如果它是占位符或正在流式输出的）
            if (targetMessageElement && (targetMessageElement.dataset.isPlaceholder === 'true' || targetMessageElement.dataset.isStreaming === 'true')) {
                // 清理旧标记
                delete targetMessageElement.dataset.isPlaceholder;
                delete targetMessageElement.dataset.isStreaming;

                // ★★★ 关键：完全重写这条消息的内容 ★★★
                // 先清空，再重建内部结构
                targetMessageElement.innerHTML = ''; // 清空所有子元素

                const senderStrong = document.createElement('strong');
                senderStrong.textContent = 'AI助手: ';
                const textSpan = document.createElement('span');
                textSpan.classList.add('message-text');
                textSpan.innerHTML = textOrHtml; // 设置渲染后的HTML

                targetMessageElement.appendChild(senderStrong);
                targetMessageElement.appendChild(textSpan);

            } else {
                // 如果没有可替换的AI消息 (例如AI直接出错，没有流式过程，也没有占位符)
                // 或者最后一条AI消息不是我们期望的状态，则创建一个全新的消息元素
                this._createNewAIChatMessageElement(role, textOrHtml, chatDisplay, true); // true表示内容是HTML
            }
        }
        // 5. 其他情况 (用户消息, 系统消息)
        else {
            this._createNewAIChatMessageElement(role, textOrHtml, chatDisplay, (role === 'assistant' || role === 'system_html')); // 系统HTML消息也需要渲染
        }

        // Scroll to bottom
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    _createNewAIChatMessageElement(role, content, chatDisplay, isHtmlContent = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        let displayRole = role;
        if (role === 'system_html') { // Special role for system messages that need HTML rendering
            messageElement.classList.add('system-message'); // Use system message style
            displayRole = 'system'; // Still display as '系统'
        } else {
            messageElement.classList.add(`${role}-message`);
        }
        
        const senderStrong = document.createElement('strong');
        let senderTextNode = '';
        if (displayRole === 'user') senderTextNode = '你: ';
        else if (displayRole === 'assistant') senderTextNode = 'AI助手: ';
        else if (displayRole === 'system') senderTextNode = '系统: ';
        senderStrong.textContent = senderTextNode;

        const textSpan = document.createElement('span');
        textSpan.classList.add('message-text');
        if (isHtmlContent) {
            textSpan.innerHTML = content;
        } else {
            textSpan.textContent = content;
        }

        messageElement.appendChild(senderStrong);
        messageElement.appendChild(textSpan);
        chatDisplay.appendChild(messageElement);
        return messageElement;
    }

    _clearAIChat() {
        if (this.aiChatDisplayElement) {
            this.aiChatDisplayElement.innerHTML = '';
        }
    }

    _setAIChatLoadingState(isLoading) {
        if (this.aiChatSendBtnElement) this.aiChatSendBtnElement.disabled = isLoading;
        if (this.aiChatInputElement) this.aiChatInputElement.disabled = isLoading;
        if (this.aiChatLoadingElement) this.aiChatLoadingElement.style.display = isLoading ? 'inline' : 'none';
        if (this.aiChatNewChatBtnElement) this.aiChatNewChatBtnElement.disabled = isLoading;
        if (this.aiChatAbortBtnElement) this.aiChatAbortBtnElement.style.display = isLoading ? 'inline-block' : 'none';
        
        // Disable mode buttons when AI is thinking
        this.aiChatModeBtns.forEach(btn => btn.disabled = isLoading);
    }

    _setAIChatInputText(text) {
        if (this.aiChatInputElement) {
            this.aiChatInputElement.value = text;
            this._adjustTextareaHeight(this.aiChatInputElement); // Adjust height for pre-filled text
        }
    }

    _setAIChatModeButtonActive(mode) {
        this.aiChatModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

}

// 创建全局UI管理器实例
window.uiManager = new UIManager();