// 可以创建一个新文件 api-metrics-manager.js，或者扩展你已有的追踪逻辑

class APIMetricsManager {
    constructor() {
        this.dailyCountStorageKey = 'apiCallCount_today_v2'; // v2以区分旧版
        this.totalCountStorageKey = 'apiCallCount_total_v2';
        this.dailyTokenStorageKey  = 'apiTokenCount_today_v1';
        this.totalTokenStorageKey  = 'apiTokenCount_total_v1';
        this.dailyLimit = 500;

        this.todayData = this.loadTodayData(); // { date: "YYYY-MM-DD", count: X }
        this.totalCalls = this.loadTotalCalls();
        this.todayTokens = this.loadTodayTokens(); // 当天已用 Token 数
        this.totalTokens = this.loadTotalTokens(); // 累计 Token 数
    }

    loadTodayData() {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
        try {
            const storedData = JSON.parse(localStorage.getItem(this.dailyCountStorageKey));
            if (storedData && storedData.date === todayStr) {
                return { date: storedData.date, count: parseInt(storedData.count, 10) || 0 };
            }
        } catch (e) { console.error("Error loading today's API count:", e); }
        // 新的一天或没有记录，或记录无效
        return { date: todayStr, count: 0 };
    }

    saveTodayData() {
        try {
            localStorage.setItem(this.dailyCountStorageKey, JSON.stringify(this.todayData));
        } catch (e) { console.error("Error saving today's API count:", e); }
    }

    loadTotalCalls() {
        try {
            const storedTotal = localStorage.getItem(this.totalCountStorageKey);
            return parseInt(storedTotal, 10) || 0;
        } catch (e) { console.error("Error loading total API calls:", e); }
        return 0;
    }

    saveTotalCalls() {
        try {
            localStorage.setItem(this.totalCountStorageKey, this.totalCalls.toString());
        } catch (e) { console.error("Error saving total API calls:", e); }
    }

    loadTodayTokens() {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            const stored = JSON.parse(localStorage.getItem(this.dailyTokenStorageKey));
            if (stored && stored.date === todayStr) return stored.tokens || 0;
        } catch(e) { console.error(e); }
        return 0;       // 新的一天或无记录
    }

    loadTotalTokens() {
        const raw = localStorage.getItem(this.totalTokenStorageKey);
        return parseInt(raw, 10) || 0;
    }

    saveTodayTokens() {
        try {
            localStorage.setItem(
              this.dailyTokenStorageKey,
              JSON.stringify({ date: this.todayData.date, tokens: this.todayTokens })
            );
        } catch(e) { console.error(e); }
    }

    saveTotalTokens() {
        try {
            localStorage.setItem(this.totalTokenStorageKey, this.totalTokens.toString());
        } catch(e) { console.error(e); }
    }

    incrementCall(tokens = 0) {
        /* 处理跨天刷新 */
        const todayStr = new Date().toISOString().split('T')[0];
        if (this.todayData.date !== todayStr) {
            this.todayData   = { date: todayStr, count: 0 };
            this.todayTokens = 0;
        }

        /* 次数 +1，Token 累加 */
        this.todayData.count += 1;
        this.totalCalls      += 1;
        this.todayTokens     += tokens;
        this.totalTokens     += tokens;

        /* 持久化 */
        this.saveTodayData();
        this.saveTotalCalls();
        this.saveTodayTokens();
        this.saveTotalTokens();

        console.log(`[APIMetrics] Daily calls: ${this.todayData.count}/${this.dailyLimit}. Tokens today: ${this.todayTokens}`);
        this.updateUIDisplay();

        if (this.todayData.count >= this.dailyLimit) {
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast('今日AI服务调用已达每日上限。', 'warning', 7000);
            }
            console.warn('[APIMetrics] Daily API call limit reached.');
        }
    }

    getTodaysCalls() {
        // 确保是最新的今日数据
        const currentTodayStr = new Date().toISOString().split('T')[0];
        if (this.todayData.date !== currentTodayStr) {
            return 0; // 新的一天，还未调用
        }
        return this.todayData.count;
    }

    getRemainingTodaysCalls() {
        return Math.max(0, this.dailyLimit - this.getTodaysCalls());
    }

    getTodaysProgressPercent() {
        if (this.dailyLimit === 0) return 0;
        return Math.min(100, (this.getTodaysCalls() / this.dailyLimit) * 100);
    }

    getTotalCalls() {
        return this.totalCalls;
    }

    getTodayTokens()  { return this.todayTokens; }
    getTotalTokens()  { return this.totalTokens; }

    // UI 更新方法，或者触发自定义事件让UI模块监听
    updateUIDisplay() {
        const event = new CustomEvent('apiMetricsUpdated', {
            detail: {
                todayUsed: this.getTodaysCalls(),
                todayRemaining: this.getRemainingTodaysCalls(),
                todayLimit: this.dailyLimit,
                todayProgressPercent: this.getTodaysProgressPercent(),
                totalCalls: this.getTotalCalls(),
                todayTokens: this.todayTokens,
                totalTokens: this.totalTokens
            }
        });
        document.dispatchEvent(event);
    }

    // (可选) 手动重置函数，用于测试
    resetAllCountsForTesting() {
        this.todayData = { date: new Date().toISOString().split('T')[0], count: 0 };
        this.totalCalls = 0;
        this.saveTodayData();
        this.saveTotalCalls();
        this.updateUIDisplay();
        console.warn("[APIMetrics] All API counts reset for testing.");
    }
}

// 全局实例
// window.apiMetricsManager = new APIMetricsManager();
// 确保在 app.js 或你的主初始化流程中创建实例，并尽早调用 updateUIDisplay() 一次以显示初始值