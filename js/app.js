// js/app.js

// --- START OF FILE app.js ---

/**
 * 学习助手应用 - 应用初始化模块
 * 负责应用的整体初始化、全局事件处理和应用生命周期管理
 */

class App {
    constructor() {
        this.initialized = false;
        this.version = "N/A";
        this.name = "学习助手";
        this.description = "应用描述";
        this.resizeTimeout = null;

        // Attempt to get config values early, with fallbacks
        if (window.AppConfig && window.AppConfig.APP_CONFIG) {
            this.version = window.AppConfig.APP_CONFIG.version || "2.0";
            this.name = window.AppConfig.APP_CONFIG.name || "学习助手";
            this.description = window.AppConfig.APP_CONFIG.description || "艺术史与世界常识题库系统";
        }
        this.aiDuelBtn = document.getElementById('aiDuelBtn');
        this.aiDuelSubjectModal = document.getElementById('aiDuelSubjectModal');
        this.closeAiDuelSubjectModal = document.getElementById('closeAiDuelSubjectModal');
        this.aiDuelSubjectSelect = document.getElementById('aiDuelSubjectSelect');
        this.cancelAiDuelSubjectBtn = document.getElementById('cancelAiDuelSubject');
        this.confirmAiDuelSubjectBtn = document.getElementById('confirmAiDuelSubject');

        // *** START: 新增/更新的 constructor 属性 ***
        this.quizContainer = document.getElementById('quizContainer');
        this.reviewContainer = document.getElementById('reviewContainer');
        this.mainContainer = document.querySelector('.container'); // 主内容区域
        // *** END: 新增/更新的 constructor 属性 ***

        this.sidebarResizer = null; // New property for the resizer handle
        this.isResizingSidebar = false; // Flag to indicate if sidebar is currently being resized
        this.minSidebarWidth = 280; // Minimum width for the sidebar
        this.maxSidebarWidth = 800; // Maximum width for the sidebar

        // NEW: Left Sidebar toggle button (reference from app.js)
        this.leftSidebarToggle = document.getElementById('leftSidebarToggle');

        // 新增：用户协议模态框的引用
        this.userAgreementModal = document.getElementById('userAgreementModal');
        this.agreeAndStartBtn = document.getElementById('agreeAndStartBtn');

        // ****** 新增：获取页脚按钮的引用 ******
        this.showAgreementBtn = document.getElementById('showAgreementBtn');
    }

    /**
     * 初始化应用 - 修改为异步支持存储系统
     */
    async init() {
        try {
            console.log(`🚀 正在初始化 ${this.name} (版本 ${this.version})...`);

            // 等待核心依赖，包括AppConfig
            await this.waitForDependenciesCore();

            // 1. 初始化存储系统
            await this.initializeStorageSystem();

            // 2. 确保AppConfig已加载
            if (!window.AppConfig || !window.AppConfig.APP_CONFIG) {
                throw new Error("AppConfig (config-data-manager.js) failed to load or initialize.");
            }
            // Update app info from config
            this.version = window.AppConfig.APP_CONFIG.version || this.version;
            this.name = window.AppConfig.APP_CONFIG.name || this.name;
            this.description = window.AppConfig.APP_CONFIG.description || "艺术史与世界常识题库系统";

            // Initialize MarkdownRenderer
            if (typeof MarkdownRenderer !== 'undefined') {
                window.markdownRenderer = new MarkdownRenderer();
                console.log("MarkdownRenderer global instance created in App.init.");
            } else {
                console.error("FATAL ERROR in App.init: MarkdownRenderer class is still NOT defined. This indicates a critical script loading/parsing order issue. Check that markdown-renderer.js is loaded AND PARSED before app.js tries to use it.");
                window.markdownRenderer = {
                    render: (text) => {
                        console.warn("Fallback markdownRenderer: rendering as plain text.");
                        return text;
                    },
                    renderStreaming: async (container, content, speed) => {
                        console.warn("Fallback markdownRenderer: rendering stream as plain text.");
                        container.innerHTML = content;
                    }
                };
                alert("一个核心渲染组件加载失败，AI生成的内容可能无法正确显示。请检查浏览器控制台。");
            }

            // 3. Initialize core data and progress managers
            if (window.dataManager && typeof window.dataManager.init === 'function') await window.dataManager.init();
            if (window.progressManager && typeof window.progressManager.init === 'function') await window.progressManager.init();

            // 4. Initialize UI manager and other UI-related modules
            if (window.uiManager && typeof window.uiManager.init === 'function') {
                 window.uiManager.init();
            } else {
                throw new Error("UIManager is not available or not initialized.");
            }

            // Initialize AdminManager AFTER UIManager, as AdminManager relies on UI elements
            if (window.adminManager && typeof window.adminManager.init === 'function') {
                window.adminManager.init();
            } else {
                console.warn("AdminManager not available or init() not found.");
            }
            
            // NEW: Initialize AIDuelManager here, ensuring AppConfig is ready
            if (window.aiDuelManager && typeof window.aiDuelManager.init === 'function') {
                window.aiDuelManager.init(); // <-- 新增这一行
            } else {
                console.warn("AIDuelManager not available or init() not found.");
            }

            // Initialize StatisticsManager
            if (window.statisticsManager && typeof window.statisticsManager.initStatisticsPage === 'function') {
                 window.statisticsManager.initStatisticsPage();
            }

            // 5. Setup global event listeners
            this.setupGlobalEventListeners(); // 确保这个在handleUserAgreement之前
            this.setupBeforeUnloadHandler();

            // Initialize API Metrics Manager
            if (!window.apiMetricsManager) {
                window.apiMetricsManager = new APIMetricsManager();
            }
            window.apiMetricsManager.updateUIDisplay();

            this.initialized = true;
            
            this.sidebarResizer = document.getElementById('sidebarResizer');
            // Assuming leftSidebar exists and is an element reference in uiManager
            this.leftSidebar = document.getElementById('leftSidebar'); 
            if (this.sidebarResizer && this.leftSidebar) {
                this.setupSidebarResizer();
            }
            await this.logInitializationSuccess();
            this.adjustLayoutForScreenSize(); // Initial layout adjustment

            // 在 init() 的末尾，日志输出之后，添加此调用
            this.handleUserAgreement();
            
        } catch (error) {
            console.error('❌ 应用初始化序列发生严重错误:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * 等待依赖加载完成 - 确保核心配置和模块可用
     */
    async waitForDependenciesCore() {
        let attempts = 0;
        // Basic check for AppConfig first, as many modules depend on it
        while (!window.AppConfig && attempts < 100) { // Wait up to 10 seconds
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.AppConfig) {
            throw new Error("AppConfig did not load in time. Please check config-data-manager.js.");
        }
    }

    /**
     * 初始化存储系统
     */
    async initializeStorageSystem() {
        console.log('💾 正在初始化存储系统...');
        try {
            if (window.storageManager) {
                const success = await window.storageManager.init();
                if (success) {
                    console.log('✅ 存储系统初始化成功');
                    const health = await window.storageManager.checkStorageHealth();
                    if (health.status !== 'good') {
                        console.warn('⚠️ 存储系统健康状况:', health.status, health.warnings);
                    }
                } else {
                    console.warn('⚠️ 存储系统初始化失败，将回退到localStorage');
                }
            } else {
                console.warn('⚠️ 存储管理器不可用，将使用localStorage');
            }
        } catch (error) {
            console.error('❌ 存储系统初始化失败:', error);
        }
    }

    /**
     * 设置全局事件监听器
     */
    setupGlobalEventListeners() {
        console.log('🎧 App: Setting up global event listeners...');
        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        window.addEventListener('resize', () => this.handleWindowResize());
        // Global mouse up to stop resize even if mouse leaves resizer
        document.addEventListener('mouseup', this.stopSidebarResize.bind(this)); 
        document.addEventListener('mousemove', this.doSidebarResize.bind(this)); // Bind globally for drag

        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e));
        console.log('✅ 全局事件监听器已设置');

        // AI Duel Button
        if (this.aiDuelBtn) {
            this.aiDuelBtn.addEventListener('click', () => {
                if (window.quizEngine && typeof window.quizEngine.prepareAIDuel === 'function') {
                    window.quizEngine.prepareAIDuel();
                } else {
                    console.error('QuizEngine 或 prepareAIDuel 方法未找到。');
                    alert('AI对决功能遇到问题，请稍后再试。');
                }
            });
        }

        // AI Duel Subject Modal controls
        if (this.closeAiDuelSubjectModal) {
            this.closeAiDuelSubjectModal.addEventListener('click', () => this.toggleAiDuelSubjectModal(false));
        }
        if (this.cancelAiDuelSubjectBtn) {
            this.cancelAiDuelSubjectBtn.addEventListener('click', () => this.toggleAiDuelSubjectModal(false));
        }
        if (this.confirmAiDuelSubjectBtn) {
            this.confirmAiDuelSubjectBtn.addEventListener('click', () => {
                const selectedSubjectId = this.aiDuelSubjectSelect.value;
                if (selectedSubjectId) {
                    this.toggleAiDuelSubjectModal(false);
                    if (window.quizEngine && typeof window.quizEngine.startAIDuel === 'function') {
                        window.quizEngine.startAIDuel(selectedSubjectId);
                    }
                } else {
                    alert('请选择一个对决科目！');
                }
            });
        }

        // "AI助手" button (openAiDiagnosticButton) - LOGIC REMOVED as the button is removed from HTML

        // NEW: Left sidebar toggle button listener (THIS IS CORRECT LOCATION)
        if (this.leftSidebarToggle) {
            this.leftSidebarToggle.addEventListener('click', () => {
                // 直接调用 App 类的 toggleLeftSidebar 方法
                this.toggleLeftSidebar(); 
            });
        }

        // ****** 新增：在 setupGlobalEventListeners 中添加对新按钮的监听 ******
        if (this.showAgreementBtn) {
            this.showAgreementBtn.addEventListener('click', () => {
                this.showUserAgreementModal(true); // 调用一个新的独立方法来显示模态框
            });
        }
    }

    /**
     * 设置侧边栏宽度调节器
     */
    setupSidebarResizer() {
        if (this.sidebarResizer) {
            this.sidebarResizer.addEventListener('mousedown', this.startSidebarResize.bind(this));
            this.loadSidebarWidth(); // Load stored width on init
        }
    }

    /**
     * 开始侧边栏宽度调节
     */
    startSidebarResize(e) {
        e.preventDefault();
        this.isResizingSidebar = true;
        document.body.classList.add('resizing-sidebar'); // Add class to body for better resizing UX
    }

    /**
     * 执行侧边栏宽度调节
     */
    doSidebarResize(e) {
        if (!this.isResizingSidebar) return;

        let newWidth = window.innerWidth - e.clientX;
        // *** START: 更新的 doSidebarResize 逻辑 ***
        newWidth = Math.max(this.minSidebarWidth, Math.min(this.maxSidebarWidth, window.innerWidth * 0.7, newWidth));

        if (this.leftSidebar) {
            this.leftSidebar.style.width = `${newWidth}px`;
        }
        // 更新 CSS 变量，让其他元素（如主内容区）可以响应
        document.documentElement.style.setProperty('--sidebar-width-desktop', `${newWidth}px`);

        this.adjustOverlayContainersWidth(newWidth); // 新增方法调用
        // *** END: 更新的 doSidebarResize 逻辑 ***
    }

    /**
     * 停止侧边栏宽度调节
     */
    stopSidebarResize() {
        if (!this.isResizingSidebar) return; // Check if resizing is actually happening
        this.isResizingSidebar = false;
        document.body.classList.remove('resizing-sidebar');
        this.saveSidebarWidth(); // Save the new width to localStorage
    }

    /**
     * 保存侧边栏宽度到 localStorage
     */
    saveSidebarWidth() {
        if (!this.leftSidebar) return;
        const currentWidth = parseInt(getComputedStyle(this.leftSidebar).width, 10);
        if (!isNaN(currentWidth)) {
            localStorage.setItem('sidebarWidth', currentWidth.toString());
            console.log("Sidebar width saved:", currentWidth);
        }
    }

    /**
     * 从 localStorage 加载侧边栏宽度
     */
    loadSidebarWidth() {
        // *** START: 替换的 loadSidebarWidth 逻辑 ***
        const savedWidth = localStorage.getItem('sidebarWidth');
        let widthToApply = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width-desktop'), 10) || 480; // Fallback to default CSS var

        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (!isNaN(width) && width >= this.minSidebarWidth && width <= this.maxSidebarWidth) {
                widthToApply = width;
            }
        }

        if (this.leftSidebar) {
            this.leftSidebar.style.width = `${widthToApply}px`;
        }
        document.documentElement.style.setProperty('--sidebar-width-desktop', `${widthToApply}px`);
        console.log("Sidebar width loaded/set to:", widthToApply);
        this.adjustOverlayContainersWidth(widthToApply); // 新增方法调用
        // *** END: 替换的 loadSidebarWidth 逻辑 ***
    }

    /**
     * 调整 quizContainer 和 reviewContainer 的宽度/位置
     */
    adjustOverlayContainersWidth(sidebarWidth) {
        if (document.documentElement.classList.contains('sidebar-active')) {
            const sidebarVisibleWidth = sidebarWidth; // 当侧边栏激活时，其实际宽度
            if (this.quizContainer && this.quizContainer.style.display === 'block') {
                this.quizContainer.style.right = `${sidebarVisibleWidth}px`;
                this.quizContainer.style.width = `calc(100% - ${sidebarVisibleWidth}px)`;
            }
            if (this.reviewContainer && this.reviewContainer.style.display === 'block') {
                this.reviewContainer.style.right = `${sidebarVisibleWidth}px`;
                this.reviewContainer.style.width = `calc(100% - ${sidebarVisibleWidth}px)`;
            }
            // 主内容区通过CSS变量和 `html.sidebar-active .container` 样式自动调整
        } else {
            // 侧边栏关闭时，重置 quiz/review container
            if (this.quizContainer) {
                this.quizContainer.style.right = '0px';
                this.quizContainer.style.width = '100%';
            }
            if (this.reviewContainer) {
                this.reviewContainer.style.right = '0px';
                this.reviewContainer.style.width = '100%';
            }
        }
    }

    /**
     * 控制左侧侧边栏的显示/隐藏
     * @param {boolean} [show] - true 显示, false 隐藏. 如果未提供，则切换状态.
     */
    toggleLeftSidebar(show) {
        if (!this.leftSidebar) return;
        const shouldShow = typeof show === 'boolean' ? show : !this.leftSidebar.classList.contains('active');

        this.leftSidebar.classList.toggle('active', shouldShow);
        document.documentElement.classList.toggle('sidebar-active', shouldShow);

        if (this.leftSidebarToggle) {
            this.leftSidebarToggle.querySelector('.arrow-icon').textContent = shouldShow ? '◀' : '▶';
        }

        // _updateBodyOverflow 辅助方法，通常由 UIManager 管理，这里为简化直接调用或假设存在
        // 确保 uiManager._updateBodyOverflow() 存在，或者将此逻辑移到 UIManager
        if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
            window.uiManager._updateBodyOverflow();
        } else {
            // Fallback / direct DOM manipulation if UIManager._updateBodyOverflow is not reliable
            document.body.style.overflow = shouldShow ? 'hidden' : '';
        }

        // 当侧边栏状态改变时，也需要调整 quiz/review container
        const currentSidebarWidth = parseInt(this.leftSidebar.style.width || getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width-desktop'), 10);
        this.adjustOverlayContainersWidth(currentSidebarWidth);
    }

    /**
     * Handle global keyboard events (e.g., Escape to close modals/sidebars)
     */
    handleGlobalKeyDown(e) {
        if (e.key === 'Escape') {
            // Priority: Quiz Engine > Review Modal > AI Upload Modal > AI Duel Select Modal > User Agreement Modal > Left Sidebar
            // Check if quiz/review/upload/duel modals are open first, and close them.
            if (window.quizEngine && window.quizEngine.quizContainer && window.quizEngine.quizContainer.style.display !== 'none') {
                window.quizEngine.close();
            } else if (window.reviewManager && window.reviewManager.reviewContainer && window.reviewManager.reviewContainer.style.display !== 'none') {
                window.reviewManager.closeReview();
            } else if (window.adminManager && window.adminManager.aiUploadModal && window.adminManager.aiUploadModal.classList.contains('active')) { // Check for .active class
                window.adminManager.showUploadModal(false);
            } else if (this.aiDuelSubjectModal && this.aiDuelSubjectModal.classList.contains('active')) { // Check for .active class
                this.toggleAiDuelSubjectModal(false);
            } else if (this.userAgreementModal && this.userAgreementModal.classList.contains('active')) { // NEW: Check for user agreement modal
                this.showUserAgreementModal(false); // Use the new method
            } else if (this.leftSidebar && this.leftSidebar.classList.contains('active')) { // Directly use App's leftSidebar
                // If left sidebar is open, close it
                this.toggleLeftSidebar(false);
            }
        }
        if (this.isDevelopmentMode()) {
            this.handleDevelopmentKeyDown(e);
        }
    }

    /**
     * Handle development mode keyboard shortcuts (Ctrl/Cmd + Shift + D/R)
     */
    async handleDevelopmentKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            await this.showDebugInfo();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            if (confirm('确定要重置所有应用数据（题库和用户进度）吗？此操作不可恢复。')) {
                await this.resetAppData();
            }
        }
    }

    /**
     * Handle visibility change (e.g., app tab/window unfocused)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            if (window.dataManager && typeof window.dataManager.saveData === 'function') window.dataManager.saveData();
            if (window.progressManager && typeof window.progressManager.saveUserProgress === 'function') window.progressManager.saveUserProgress();
        }
    }

    /**
     * Handle window resize (debounced)
     * Calls adjustLayoutForScreenSize to re-evaluate layout
     */
    handleWindowResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.adjustLayoutForScreenSize();
            // 在窗口大小调整后，如果侧边栏处于激活状态，需要再次调整覆盖容器的宽度
            if (this.leftSidebar && document.documentElement.classList.contains('sidebar-active')) {
                const currentSidebarWidth = parseInt(this.leftSidebar.style.width || getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width-desktop'), 10);
                this.adjustOverlayContainersWidth(currentSidebarWidth);
            }
        }, 250);
    }

    /**
     * Adjust layout based on screen size (for responsive design)
     * Now primarily sets `mobile-view`/`desktop-view` classes, CSS handles shifting.
     */
    adjustLayoutForScreenSize() {
        const width = window.innerWidth;
        if (width <= 768) {
            document.body.classList.add('mobile-view');
            document.body.classList.remove('desktop-view');
            // 移动视图下，默认隐藏侧边栏
            if (this.leftSidebar && this.leftSidebar.classList.contains('active')) {
                this.toggleLeftSidebar(false);
            }
        } else {
            document.body.classList.add('desktop-view');
            document.body.classList.remove('mobile-view');
        }
        if (window.uiManager) {
            window.uiManager._updateBodyOverflow();
        }
    }


    /**
     * Handle global uncaught errors
     */
    handleGlobalError(e) {
        console.error('🚨 全局错误:', e.error || e.message, e);
        this.reportError(e.error || new Error(e.message));
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(e) {
        console.error('🚨 未处理的Promise拒绝:', e.reason);
        e.preventDefault();
        this.reportError(e.reason);
    }

    /**
     * Setup beforeunload handler to warn user about unsaved progress
     */
    setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            const quizInProgress = window.quizEngine &&
                                 window.quizEngine.currentQuizData !== null &&
                                 !window.quizEngine.isReviewMode &&
                                 window.quizEngine.finalScoreContainer &&
                                 window.quizEngine.finalScoreContainer.style.display === 'none';

            const reviewInProgress = window.reviewManager &&
                                   window.reviewManager.reviewContainer &&
                                   window.reviewManager.reviewContainer.style.display !== 'none';

            if (quizInProgress || reviewInProgress) {
                const message = '您正在进行测试或回顾，确定要离开吗？您的进度将不会被保存。';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }

    /**
     * Display a critical initialization error message to the user
     */
    showInitializationError(error) {
        try {
            const errorDivId = 'appInitError';
            let errorDiv = document.getElementById(errorDivId);
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = errorDivId;
                errorDiv.innerHTML = `
                    <div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);max-width:90%;width:500px;background:#fee;border:2px solid #fcc;border-radius:8px;padding:20px;z-index:10000;color:#c33;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                        <h3 style="margin:0 0 10px 0;color:#a00;">⚠️ 应用初始化失败</h3>
                        <p style="margin:0 0 10px 0;">应用无法正常启动。这可能是由于必要的文件未能加载或配置错误。请尝试以下操作：</p>
                        <ul style="margin:0 0 10px 20px;padding:0;list-style-type:disc;">
                            <li>刷新页面。</li>
                            <li>清除浏览器缓存和 Cookie 后重试。</li>
                            <li>检查网络连接。</li>
                            <li>如果问题持续，请联系技术支持或检查浏览器控制台获取详细错误信息。</li>
                        </ul>
                        <details style="margin:10px 0 0 0;">
                            <summary style="cursor:pointer;color:#666;">查看错误详情</summary>
                            <pre style="background:#f5f5f5;padding:10px;margin:10px 0 0 0;border-radius:4px;overflow:auto;font-size:12px;max-height:150px;"></pre>
                        </details>
                        <button onclick="location.reload()" style="background:#007cba;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:15px;">
                            刷新页面
                        </button>
                    </div>
                `;
                document.body.appendChild(errorDiv);
            }
            const preElement = errorDiv.querySelector('pre');
            if (preElement) {
                 preElement.textContent = `${error.message}\n\n${error.stack || '(无堆栈信息)'}`;
            }
        } catch (domError) {
            console.error("无法显示初始化错误浮层:", domError);
            alert(`应用初始化失败: ${error.message}. 请检查控制台获取更多信息.`);
        }
    }

    /**
     * Log successful initialization and display initial stats/warnings
     */
    async logInitializationSuccess() {
        let stats = { subjects: 0, periods: 0, quizzes: 0, questions: 0 };
        let storageInfo = null;
        
        try {
            if (window.dataManager && window.dataManager.getDataStatistics) {
                stats = window.dataManager.getDataStatistics();
            }
            
            if (window.dataManager && typeof window.dataManager.getStorageStatistics === 'function') {
                const fullStats = await window.dataManager.getStorageStatistics();
                storageInfo = fullStats.storage;
            } else if (window.storageManager && typeof window.storageManager.getStorageInfo === 'function') {
                storageInfo = await window.storageManager.getStorageInfo();
            }

        } catch (error) {
            console.warn('获取统计信息失败:', error);
        }

        console.log(`✅ ${this.name} 初始化完成 (版本 ${this.version})`);
        console.log('📊 当前数据统计:', stats);
        
        if (storageInfo) {
            console.log('💾 存储系统信息:', storageInfo);
            
            let warnings = [];
            if (storageInfo.warnings && storageInfo.warnings.length > 0) {
                warnings = storageInfo.warnings;
            } else if (window.storageManager) {
                const health = await window.storageManager.checkStorageHealth();
                if (health.warnings && health.warnings.length > 0) {
                    warnings = health.warnings;
                }
            }

            if (warnings.length > 0) {
                console.warn('⚠️ 存储警告:', warnings);
                if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast(`存储提醒：${warnings[0]}`, 'warning', 5000);
                }
            }
        }

        if (this.isDevelopmentMode()) {
            console.log('🔧 开发模式已启用');
            console.log('💡 快捷键提示: Ctrl/Cmd + Shift + D (调试信息), Ctrl/Cmd + Shift + R (重置数据)');
        }
    }

    /**
     * Check if the application is running in a development environment
     */
    isDevelopmentMode() {
        return ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';
    }

    /**
     * Display debug information (for development mode)
     */
    async showDebugInfo() {
        let dataStats = {};
        let progressStats = {};
        let storageStats = {};
        
        try {
            if (window.dataManager?.getDataStatistics) dataStats = window.dataManager.getDataStatistics();
            if (window.progressManager?.getUserStatistics) progressStats = window.progressManager.getUserStatistics();
            
            if (window.storageManager) {
                const storageInfo = await window.storageManager.getStorageInfo();
                const health = await window.storageManager.checkStorageHealth();
                storageStats = { 
                    type: storageInfo.type, 
                    health: health.status,
                    warnings: health.warnings,
                    quota: storageInfo.quota ? `${(storageInfo.quota.usage / (1024*1024)).toFixed(2)}MB / ${(storageInfo.quota.quota / (1024*1024)).toFixed(2)}MB` : 'N/A',
                    fallback: window.storageManager.fallbackToLocalStorage,
                    stores: storageInfo.stores
                };
            }
        } catch (e) { 
            console.warn("获取统计信息失败", e); 
            storageStats = { Error: e.message };
        }

        const debugInfo = {
            App: { Name: this.name, Version: this.version, Initialized: this.initialized },
            UI: { CurrentLevel: window.uiManager?.currentState?.level, CurrentTab: window.uiManager?.currentState?.currentTab },
            DataStats: dataStats,
            ProgressStats: { Quizzes: progressStats.totalQuizzes, Questions: progressStats.totalQuestions, Accuracy: `${progressStats.accuracy?.toFixed(1)}%`},
            Storage: storageStats,
            Browser: { UserAgent: navigator.userAgent, Language: navigator.language, Online: navigator.onLine }
        };
        
        console.groupCollapsed('🔍 应用调试信息 (点击展开)');
        console.table(debugInfo.App);
        console.log('UI State:', debugInfo.UI);
        console.log('Data Stats:', debugInfo.DataStats);
        console.log('Progress Stats:', debugInfo.ProgressStats);
        console.log('Storage Stats:', debugInfo.Storage);
        console.log('Browser:', debugInfo.Browser);
        console.groupEnd();
        
        const storageText = storageStats.type ? `\n存储: ${storageStats.type} (${storageStats.health || 'N/A'})` : '';
        alert(`调试信息已输出到控制台。\n题库: ${dataStats.quizzes || 'N/A'}, 题目: ${dataStats.questions || 'N/A'}\n已完成测验: ${progressStats.totalQuizzes || 'N/A'}, 整体正确率: ${progressStats.accuracy?.toFixed(1) || 'N/A'}%${storageText}`);
    }

    /**
     * Get storage size information (for debug)
     */
    async getStorageSize() {
        try {
            if (window.storageManager && typeof window.storageManager.getStorageInfo === 'function') {
                const storageInfo = await window.storageManager.getStorageInfo();
                let quizDataSize = '无数据';
                let progressDataSize = '无数据';

                if (storageInfo.stores?.quizData?.estimatedSize) {
                    quizDataSize = (storageInfo.stores.quizData.estimatedSize / 1024).toFixed(2) + ' KB';
                }
                if (storageInfo.stores?.userProgress?.estimatedSize) {
                    progressDataSize = (storageInfo.stores.userProgress.estimatedSize / 1024).toFixed(2) + ' KB';
                }
                
                let totalUsage = '未知';
                if (storageInfo.quota && storageInfo.quota.usage !== undefined && storageInfo.quota.quota !== undefined) {
                    totalUsage = `${(storageInfo.quota.usage / (1024*1024)).toFixed(2)} MB / ${(storageInfo.quota.quota / (1024*1024)).toFixed(2)} MB`;
                } else if (storageInfo.quota && storageInfo.quota.usage !== undefined) {
                     totalUsage = `${(storageInfo.quota.usage / (1024*1024)).toFixed(2)} MB used`;
                }


                return {
                    StorageType: storageInfo.type,
                    QuizData: quizDataSize,
                    ProgressData: progressDataSize,
                    TotalUsage: totalUsage
                };
            } else {
                // Fallback to original localStorage method
                const quizDataKey = window.AppConfig?.APP_CONFIG?.storageKey || 'artQuizData';
                const progressDataKey = quizDataKey + '_userProgress';

                const quizData = localStorage.getItem(quizDataKey);
                const progressData = localStorage.getItem(progressDataKey);

                const quizSize = quizData ? (new Blob([quizData]).size / 1024).toFixed(2) + ' KB' : '无数据';
                const progressSize = progressData ? (new Blob([progressData]).size / 1024).toFixed(2) + ' KB' : '无数据';

                return {
                    StorageType: 'localStorage (fallback)',
                    QuizData: `${quizDataKey}: ${quizSize}`,
                    ProgressData: `${progressDataKey}: ${progressSize}`
                };
            }
        } catch (error) {
            return { Error: '无法计算存储大小: ' + error.message };
        }
    }

    /**
     * Reset all application data (quizzes and user progress)
     */
    async resetAppData() {
        try {
            if (window.storageManager) {
                console.log("重置主数据 (quizData, userProgress)...");
                await window.storageManager.removeItem('quizData', 'main');
                await window.storageManager.removeItem('userProgress', 'main');
                
                if (confirm('是否同时清理所有备份数据？这可能包括历史数据和自动备份。')) {
                    console.log("开始清理备份数据...");
                    const backups = await window.storageManager.getBackupList();
                    if (backups && backups.length > 0) {
                        for (const backup of backups) {
                            await window.storageManager.removeItem(window.storageManager.stores.backup, backup.id);
                            console.log(`删除备份: ${backup.id}`);
                        }
                         console.log("所有备份数据已清理。");
                    } else {
                        console.log("未找到备份数据。");
                    }
                }
            } else {
                console.log("使用 localStorage 回退方法重置数据...");
                const quizDataKey = window.AppConfig?.APP_CONFIG?.storageKey || 'artQuizData';
                const progressDataKey = quizDataKey + '_userProgress';

                localStorage.removeItem(quizDataKey);
                localStorage.removeItem(progressDataKey);
            }

            alert('应用数据已重置，页面将自动刷新。');
            location.reload();
        } catch (error) {
            console.error('重置数据失败:', error);
            alert('重置数据失败：' + error.message);
        }
    }

    /**
     * Report an error (e.g., to a logging service in production)
     */
    reportError(error) {
        console.warn('📝 错误已记录（开发模式）:', error, error?.stack);
    }

    /**
     * Toggle AI Duel Subject Selection Modal
     */
    toggleAiDuelSubjectModal(show) {
        if (this.aiDuelSubjectModal) {
            console.log(`[App] Toggling AI Duel Subject Modal. Show: ${show}. Modal element found:`, !!this.aiDuelSubjectModal);

            // 使用 classList.toggle 来控制 'active' 类
            this.aiDuelSubjectModal.classList.toggle('active', show);

            if (show) {
                if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
                    window.uiManager._updateBodyOverflow();
                } else {
                    console.warn("UIManager or _updateBodyOverflow method not available when showing AI duel modal.");
                }

                if (window.dataManager && this.aiDuelSubjectSelect) {
                    this.aiDuelSubjectSelect.innerHTML = '';
                    
                    // --- 核心逻辑修改 ---
                    // 1. 获取我们期望展示的目录结构（来自配置文件）
                    const expectedSubjectStructure = window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA;
                    
                    // 2. 获取当前实时加载的所有数据（包括旧的）
                    const allLoadedData = window.dataManager.getData();
                    
                    if (expectedSubjectStructure && allLoadedData) {
                        let hasSubjects = false;
                        
                        // 3. 严格遍历期望的目录ID（例如 "chapter_0", "chapter_1" 等）
                        for (const expectedSubjectId in expectedSubjectStructure) {
                            
                            // 4. 从实时数据中查找这个期望的目录
                            const liveSubjectData = allLoadedData[expectedSubjectId];
                            
                            // 5. 只有当这个目录在实时数据中确实存在时，才创建选项
                            if (liveSubjectData && liveSubjectData.name) {
                                const option = document.createElement('option');
                                option.value = liveSubjectData.id;
                                option.textContent = liveSubjectData.name;
                                this.aiDuelSubjectSelect.appendChild(option);
                                hasSubjects = true;
                            }
                        }
                        // --- 修改结束 ---

                        if (!hasSubjects) {
                            const noSubjectsOption = document.createElement('option');
                            noSubjectsOption.textContent = "暂无可对决的科目";
                            noSubjectsOption.disabled = true;
                            this.aiDuelSubjectSelect.appendChild(noSubjectsOption);
                            if(this.confirmAiDuelSubjectBtn) this.confirmAiDuelSubjectBtn.disabled = true;
                        } else {
                            if(this.confirmAiDuelSubjectBtn) this.confirmAiDuelSubjectBtn.disabled = false;
                        }
                    } else {
                        const errorOption = document.createElement('option');
                        errorOption.textContent = "加载科目失败";
                        errorOption.disabled = true;
                        this.aiDuelSubjectSelect.appendChild(errorOption);
                        if(this.confirmAiDuelSubjectBtn) this.confirmAiDuelSubjectBtn.disabled = true;
                    }
                }
            } else {
                if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
                     window.uiManager._updateBodyOverflow();
                }
            }
        } else {
            console.error("[App] AI Duel Subject Modal element (this.aiDuelSubjectModal) is null or undefined.");
        }
    }

    // ****** 新增：将显示和关闭模态框的逻辑提取成独立方法 ******
    showUserAgreementModal(shouldShow) {
        if (!this.userAgreementModal) {
             console.warn("[App] User Agreement Modal element (this.userAgreementModal) is null or undefined.");
             return;
        }

        console.log(`[App] Toggling User Agreement Modal. Show: ${shouldShow}. Modal element found:`, !!this.userAgreementModal);
        this.userAgreementModal.classList.toggle('active', shouldShow);
        
        // 智能处理背景滚动
        if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
            window.uiManager._updateBodyOverflow();
        } else {
            // Fallback
            document.body.classList.toggle('modal-open', shouldShow);
        }
    }

    // --- 新增方法：处理用户协议 ---
    handleUserAgreement() {
        const agreementKey = 'userAgreementAccepted_v1'; // v1 表示协议版本，方便未来更新
        const hasAccepted = localStorage.getItem(agreementKey);

        if (!hasAccepted) {
            // ****** 修改：调用新的显示方法 ******
            this.showUserAgreementModal(true);
        }

        if (this.agreeAndStartBtn) {
            // Ensure we don't add multiple listeners if handleUserAgreement is called more than once
            if (!this.agreeAndStartBtn._hasAgreementListener) {
                 this.agreeAndStartBtn.addEventListener('click', () => {
                    localStorage.setItem(agreementKey, 'true');
                    // ****** 修改：调用新的关闭方法 ******
                    this.showUserAgreementModal(false);
                 }, { once: true }); // 使用 once: true 确保事件监听器只触发一次
                 this.agreeAndStartBtn._hasAgreementListener = true; // Mark listener as added
            }
        } else {
             console.warn("[App] Agree and Start Button (this.agreeAndStartBtn) is null or undefined.");
        }
    }
    // --- 新增方法结束 ---
}

async function initApp() {
    window.app = new App();
    try {
        await window.app.init();
    } catch (error) {
        console.error('顶层应用启动序列错误:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
// --- END OF FILE app.js ---