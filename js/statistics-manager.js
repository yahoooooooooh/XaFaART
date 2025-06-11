

// --- START OF FILE statistics-manager.js (MODIFIED FOR STAGE 1) ---

/**
学习助手应用 - 统计管理模块

负责学习数据的统计分析、图表展示、成就管理等功能
*/

class StatisticsManager {
    constructor() {
    this.chartInstances = {}; // 用于存储 Chart.js 实例
    this.currentTimeRange = '7d'; // '7d', '30d', '90d', 'all'

    this.initElements();
        this.setupEventListeners();
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        // 统计容器
        this.statisticsContainer = document.getElementById('statisticsContainer');
        this.overviewSection = document.getElementById('overviewSection');
        this.chartsSection = document.getElementById('chartsSection');
        this.achievementsSection = document.getElementById('achievementsSection');

        // 概览统计
        this.totalQuizzes = document.getElementById('totalQuizzes');
        this.totalQuestionsAnswered = document.getElementById('totalQuestionsAnswered'); // 总回答题目次数
        this.totalCorrectAttempts = document.getElementById('totalCorrectAttempts');     // 累计答对次数
        this.totalIncorrectAttempts = document.getElementById('totalIncorrectAttempts'); // 累计答错次数
        this.uniqueIncorrectInBook = document.getElementById('uniqueIncorrectInBook');   // 错题本收录题目数
        this.overallAccuracy = document.getElementById('overallAccuracy');             // 整体正确率 (可选保留)
        this.studyStreak = document.getElementById('studyStreak');
        this.studyDays = document.getElementById('studyDays');
        this.averageTime = document.getElementById('averageTime');

        // NEW elements for additional stats
        this.totalSystemQuizzes = document.getElementById('totalSystemQuizzes');
        this.totalSystemQuestions = document.getElementById('totalSystemQuestions');
        this.completedUserQuizzes = document.getElementById('completedUserQuizzes');
        this.totalEffectiveTime = document.getElementById('totalEffectiveTime');

        // 图表容器
        this.accuracyChart = document.getElementById('accuracyChart');  // <canvas> for Chart.js
        this.timeChart = document.getElementById('timeChart');        // <canvas> for Chart.js
        this.subjectChart = document.getElementById('subjectChart');  // <canvas> for Chart.js
        this.difficultyChart = document.getElementById('difficultyChart'); // <canvas> for Chart.js
        console.log("[StatsManager] Difficulty Chart Element:", this.difficultyChart); // 添加日志
        this.calendarChart = document.getElementById('calendarChart'); // 现在是 <div> for HTML/SVG heatmap

        // 时间范围选择
        this.timeRangeSelector = document.getElementById('timeRangeSelector');

        // 成就展示
        this.achievementsList = document.getElementById('achievementsList');

        // 控制按钮
        this.refreshStatsBtn = document.getElementById('refreshStatsBtn');
        this.exportStatsBtn = document.getElementById('exportStatsBtn');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (this.timeRangeSelector) {
            this.timeRangeSelector.addEventListener('change', () => {
                this.currentTimeRange = this.timeRangeSelector.value;
                this.updateCharts();
            });
        }

        if (this.refreshStatsBtn) {
            this.refreshStatsBtn.addEventListener('click', () => this.refreshStatistics());
        }

        if (this.exportStatsBtn) {
            this.exportStatsBtn.addEventListener('click', () => this.exportStatistics());
        }
    }

    /**
     * 初始化统计页面
     */
    initStatisticsPage() {
        this.updateOverviewStats();
        this.updateCharts();
        this.updateAchievements();
    }

    /**
     * 更新概览统计
     */
    updateOverviewStats() {
        if (!window.progressManager || !window.progressManager.isInitialized()) {
            this.showEmptyStats();
            return;
        }

        const stats = window.progressManager.getUserStatistics(); // This now includes the new stats
        const allIncorrectInBook = window.progressManager.getIncorrectQuestions({}) || [];

        if (this.totalQuizzes) {
            this.totalQuizzes.textContent = stats.totalQuizzes || 0; // User's attempted quizzes
        }
        if (this.totalQuestionsAnswered) {
            this.totalQuestionsAnswered.textContent = stats.totalQuestions || 0;
        }
        if (this.totalCorrectAttempts) {
            this.totalCorrectAttempts.textContent = stats.totalCorrect || 0;
        }
        if (this.totalIncorrectAttempts) {
            this.totalIncorrectAttempts.textContent = stats.totalIncorrect || 0;
        }
        if (this.uniqueIncorrectInBook) {
            this.uniqueIncorrectInBook.textContent = allIncorrectInBook.length;
        }

        if (this.overallAccuracy) {
            this.overallAccuracy.textContent = `${(stats.accuracy || 0).toFixed(1)}%`;
            const accuracyCard = this.overallAccuracy.closest('.stat-card');
            if (accuracyCard) {
                let explanation = accuracyCard.querySelector('.stat-explanation');
                if (!explanation) {
                    explanation = document.createElement('small');
                    explanation.className = 'stat-explanation';
                    Object.assign(explanation.style, {
                        display: 'block', fontSize: '0.7em', color: 'var(--text-muted)', marginTop: '3px'
                    });
                    const statContent = this.overallAccuracy.closest('.stat-content');
                    if (statContent) statContent.appendChild(explanation);
                }
                explanation.textContent = `(累计答对 / 总回答次数)`;
            }
        }

        // NEW: Update new stat elements
        if (this.totalSystemQuizzes) {
            this.totalSystemQuizzes.textContent = stats.totalUniqueQuizzesInSystem || 0;
        }
        if (this.totalSystemQuestions) {
            this.totalSystemQuestions.textContent = stats.totalQuestionsInSystem || 0;
        }
        if (this.completedUserQuizzes) {
            this.completedUserQuizzes.textContent = stats.completedUniqueQuizzesCount || 0;
        }
        if (this.totalEffectiveTime) {
            // MODIFIED: Use Utils.formatTime
            this.totalEffectiveTime.textContent = Utils.formatTime(stats.totalEffectiveStudyTime || 0);
        }
        // END NEW

        if (this.studyStreak) {
            this.studyStreak.textContent = stats.streakCount || 0;
        }
        if (this.studyDays) {
            this.studyDays.textContent = stats.studyDays || 0;
        }
        if (this.averageTime) {
            const avgTime = stats.averageTime || 0;
            // MODIFIED: Use Utils.formatTime
            this.averageTime.textContent = Utils.formatTime(avgTime);
        }

        this.addTrendIndicators(stats);
    }

    /**
     * 显示空统计状态
     */
    showEmptyStats() {
        const elements = [
            this.totalQuizzes, this.totalQuestionsAnswered, this.totalCorrectAttempts,
            this.totalIncorrectAttempts, this.uniqueIncorrectInBook, this.overallAccuracy,
            this.studyStreak, this.studyDays, this.averageTime,
            // NEW: Add new elements here
            this.totalSystemQuizzes, this.totalSystemQuestions, this.completedUserQuizzes,
            this.totalEffectiveTime
        ];

        elements.forEach(el => {
            if (el) {
                if (el.id === 'totalEffectiveTime' || el.id === 'averageTime') { // averageTime as well
                     el.textContent = '0秒';
                } else {
                     el.textContent = '0';
                }
            }
        });
        if (this.overallAccuracy) {
            const accuracyCard = this.overallAccuracy.closest('.stat-card');
            const explanation = accuracyCard?.querySelector('.stat-explanation');
            if (explanation) explanation.textContent = `(累计答对 / 总回答次数)`;
        }
    }

    /**
     * 添加趋势指示器
     */
    addTrendIndicators(stats) {
        const card = this.overallAccuracy?.closest('.stat-card');
        if (!card) return;

        card.classList.remove('trend-up', 'trend-down', 'trend-neutral');

        const accuracy = stats.accuracy || 0;
        let trendClass = 'trend-neutral';
        if (accuracy >= 90) trendClass = 'trend-up';
        else if (accuracy < 60) trendClass = 'trend-down';

        card.classList.add(trendClass);
    }

    /**
     * 更新图表
     */
    updateCharts() {
        if (!window.progressManager || !window.progressManager.isInitialized()) return;

        const analytics = window.progressManager.getStudyAnalytics();

        this.updateAccuracyChart(analytics);
        this.updateTimeChart(analytics);
        this.updateSubjectChart(analytics);
        this.updateDifficultyChart(analytics);
        this.updateCalendarChart(analytics);
    }

    /**
     * 更新准确率趋势图 - 使用 Chart.js
     */
    updateAccuracyChart(analytics) {
        if (!this.accuracyChart) return;

        const dailyData = this.filterDataByTimeRange(analytics.daily);
        const chartData = dailyData
            .map(d => ({
                label: new Date(d.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }), // 格式化日期
                value: d.accuracy
            }))
            .filter(d => Number.isFinite(d.value));

        this.renderLineChart(this.accuracyChart, {
            title: '准确率趋势',
            data: chartData,
            color: '#4CAF50',
            unit: '%'
        });
    }

    /**
     * 更新用时趋势图 - 使用 Chart.js
     */
    updateTimeChart(analytics) {
        if (!this.timeChart) return;

        const dailyData = this.filterDataByTimeRange(analytics.daily);
        // Assuming analytics.daily items have `averageTimePerQuestion`
        const chartData = dailyData
            .map(d => ({
                label: new Date(d.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
                value: (d.averageTimePerQuestion || 0) / 1000
            }))
            .filter(d => Number.isFinite(d.value));

        this.renderLineChart(this.timeChart, {
            title: '平均用时/题趋势',
            data: chartData,
            color: '#2196F3',
            unit: '秒'
        });
    }

    /**
     * 更新学科分布图 - 使用 Chart.js
     */
    updateSubjectChart(analytics) {
        if (!this.subjectChart || !window.dataManager) return;

        const allQuizData = window.dataManager.getData();
        const subjectData = analytics.subjects.map(s => ({
            name: allQuizData[s.subjectId]?.name || s.subjectId,
            value: s.quizCount, // This represents quiz attempts for this subject
            // accuracy: s.accuracy // Can be used in tooltips if needed
        })).filter(s => s.value > 0);

        this.renderPieChart(this.subjectChart, {
            title: '学科分布 (测验次数)',
            data: subjectData
        });
    }

    /**
     * 更新难度分布图 - 使用 Chart.js
     */
    updateDifficultyChart(analytics) {
        if (!this.difficultyChart) return;

        const difficultyData = [
            { name: '简单', value: analytics.difficulty.easy || 0, color: '#4CAF50' },
            { name: '中等', value: analytics.difficulty.medium || 0, color: '#FF9800' },
            { name: '困难', value: analytics.difficulty.hard || 0, color: '#F44336' }
        ].filter(d => d.value > 0);

        this.renderBarChart(this.difficultyChart, {
            title: '难度分布 (题目数)', // This might be better as '测验次数按难度' if analytics.difficulty reflects quiz counts
            data: difficultyData
        });
    }

    /**
     * 更新学习日历热力图
     */
    updateCalendarChart(analytics) {
        if (!this.calendarChart) return; // this.calendarChart is now the div

        const dailyData = analytics.daily;
        this.renderCalendarHeatmap(this.calendarChart, {
            title: '学习活跃度',
            data: dailyData // dailyData should have { date, quizCount (or similar activity metric) }
        });
    }

    /**
     * 根据时间范围筛选数据
     */
    filterDataByTimeRange(data) {
        if (!Array.isArray(data)) return [];
        const now = new Date();
        let cutoffDate;

        switch (this.currentTimeRange) {
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default: // 'all'
                return data;
        }

        return data.filter(d => new Date(d.date) >= cutoffDate);
    }

    _showChartMessage(chartContainer, message, messageType = 'no-data') {
        if (!chartContainer) {
            console.error("Cannot show chart message: chartContainer is null.");
            return;
        }

        this._clearChartMessage(chartContainer);

        const messageDiv = document.createElement('div');
        messageDiv.className = `chart-message chart-message-${messageType}`;
        messageDiv.textContent = message;

        Object.assign(messageDiv.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '15px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9em',
            zIndex: '10'
        });
        if(messageType === 'error'){
            messageDiv.style.color = 'var(--error-color)';
        }

        if (getComputedStyle(chartContainer).position === 'static') {
            chartContainer.style.position = 'relative';
        }

        chartContainer.appendChild(messageDiv);
    }

    _clearChartMessage(chartContainer) {
        if (!chartContainer) return;
        const existingMessage = chartContainer.querySelector('.chart-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    renderLineChart(canvasElement, config) {
        if (!canvasElement) {
            console.error("Canvas element is null for line chart:", config.title);
            return;
        }
        const chartContainer = canvasElement.parentElement;
        if (!chartContainer) {
            console.error("Canvas element's parentElement is null for line chart:", config.title, "Canvas:", canvasElement);
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded. Cannot render chart:", config.title);
            this._showChartMessage(chartContainer, "图表库加载失败", "error");
            return;
        }

        if (this.chartInstances[canvasElement.id]) {
            this.chartInstances[canvasElement.id].destroy();
        }

        if (!config.data || config.data.length === 0 || config.data.every(d => d.value === null || d.value === undefined)) {
            this._showChartMessage(chartContainer, `${config.title}: 暂无数据`);
            canvasElement.style.display = 'none';
            return;
        }

        this._clearChartMessage(chartContainer);
        canvasElement.style.display = 'block';

        const labels = config.data.map(d => d.label);
        const dataValues = config.data.map(d => d.value);

        this.chartInstances[canvasElement.id] = new Chart(canvasElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: config.title,
                    data: dataValues,
                    borderColor: config.color || '#4CAF50',
                    backgroundColor: config.color ? `${config.color}33` : '#4CAF5033',
                    tension: 0.1,
                    fill: true,
                    pointRadius: dataValues.length > 1 ? 3 : (dataValues.length === 1 ? 5 : 0),
                    pointHoverRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: config.title,
                        font: { size: 16, weight: '500' },
                        color: 'var(--text-primary)',
                        padding: { top: 10, bottom: 15 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(config.unit === '%' ? 1 : (config.unit === '秒' ? 1 : 0)) + (config.unit || '');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: labels.length > 0,
                            text: '日期',
                            font: { size: 12 },
                            color: 'var(--text-muted)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: labels.length > 10 ? 7 : (labels.length || 1)
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: config.unit ? `${config.title} (${config.unit})` : config.title,
                            font: { size: 12 },
                            color: 'var(--text-muted)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 10 },
                            callback: function(value) {
                                return value.toFixed(config.unit === '%' ? 0 : 0) + (config.unit && value !==0 ? (config.unit === '秒' ? 's': config.unit) : '');
                            }
                        },
                        beginAtZero: config.unit === '%' ? false : true,
                        grace: '5%'
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    renderPieChart(canvasElement, config) {
        if (!canvasElement) {
            console.error("Canvas element is null for pie chart:", config.title);
            return;
        }
        const chartContainer = canvasElement.parentElement;
        if (!chartContainer) {
            console.error("Canvas element's parentElement is null for pie chart:", config.title, "Canvas:", canvasElement);
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded. Cannot render chart:", config.title);
            this._showChartMessage(chartContainer, "图表库加载失败", "error");
            return;
        }
        if (this.chartInstances[canvasElement.id]) {
            this.chartInstances[canvasElement.id].destroy();
        }
        if (!config.data || config.data.length === 0 || config.data.every(d => d.value === 0)) {
            this._showChartMessage(chartContainer, `${config.title}: 暂无数据`);
            canvasElement.style.display = 'none';
            return;
        }

        this._clearChartMessage(chartContainer);
        canvasElement.style.display = 'block';

        const labels = config.data.map(d => d.name);
        const dataValues = config.data.map(d => d.value);
        const backgroundColors = config.data.length > 1 ? [
            '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0',
            '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63'
        ].slice(0, config.data.length) : ['#4CAF50'];


        this.chartInstances[canvasElement.id] = new Chart(canvasElement, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: config.title,
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: config.title,
                        font: { size: 16, weight: '500' },
                        color: 'var(--text-primary)',
                        padding: { top: 10, bottom: 15 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 11 },
                            color: 'var(--text-secondary)',
                            boxWidth: 15,
                            padding: 10
                        }
                    },
                    tooltip: {
                         callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? (context.raw / total * 100).toFixed(1) + '%' : '0%';
                                    label += ` (${percentage})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                 animation: {
                    duration: 600,
                    easing: 'easeOutBounce'
                }
            }
        });
    }

    renderBarChart(canvasElement, config) {
        if (!canvasElement) {
            console.error("Canvas element is null for bar chart:", config.title);
            return;
        }
        const chartContainer = canvasElement.parentElement;
        if (!chartContainer) {
            console.error("Canvas element's parentElement is null for bar chart:", config.title, "Canvas:", canvasElement);
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded. Cannot render chart:", config.title);
            this._showChartMessage(chartContainer, "图表库加载失败", "error");
            return;
        }
        if (this.chartInstances[canvasElement.id]) {
            this.chartInstances[canvasElement.id].destroy();
        }
        if (!config.data || config.data.length === 0 || config.data.every(d => d.value === 0)) {
            this._showChartMessage(chartContainer, `${config.title}: 暂无数据`);
            canvasElement.style.display = 'none';
            return;
        }

        this._clearChartMessage(chartContainer);
        canvasElement.style.display = 'block';

        const labels = config.data.map(d => d.name);
        const dataValues = config.data.map(d => d.value);
        const backgroundColors = config.data.map(d => d.color || '#2196F3');
        const borderColors = backgroundColors.map(color => color);

        this.chartInstances[canvasElement.id] = new Chart(canvasElement, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: config.title,
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: config.title,
                        font: { size: 16, weight: '500' },
                        color: 'var(--text-primary)',
                        padding: { top: 10, bottom: 15 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 11 }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: { size: 10 },
                        },
                        grid: {
                            drawBorder: false,
                            color: Chart.defaults.borderColor
                        }
                    }
                },
                animation: {
                    duration: 700,
                    easing: 'easeOutCubic'
                }
            }
        });
    }

    renderCalendarHeatmap(container, config) {
        if (!container) {
            console.error("Container element not found for calendar heatmap:", config.title);
            return;
        }
        container.innerHTML = '';

        if (!config.data || config.data.length === 0) {
            container.innerHTML = '<div class="no-data" style="text-align:center; padding: 20px;">暂无学习活跃度数据</div>';
            return;
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const endDate = new Date(today);

        const daysToDisplay = 90;
        const startDate = new Date(today.getTime() - (daysToDisplay - 1) * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);


        const dataMap = new Map();
        config.data.forEach(item => {
            if (item.date) {
                const itemDate = new Date(item.date);
                itemDate.setHours(0,0,0,0);
                const dateKey = itemDate.toDateString();
                dataMap.set(dateKey, item);
            }
        });

        let calendarHTML = `<div class="calendar-heatmap-container">
                                <h4 class="chart-title-custom">${config.title}</h4>
                                <div class="calendar-grid">`;

        let tempDate = new Date(startDate);
        while(tempDate <= endDate) {
            const dateStr = tempDate.toDateString();
            const dayData = dataMap.get(dateStr);

            const activityCount = dayData ? (dayData.quizCount || 0) : 0;
            let intensity = 0;
            if (activityCount > 0) intensity = Math.min(activityCount / 5, 1);

            const alpha = activityCount === 0 ? 0.1 : 0.3 + (intensity * 0.7);

            calendarHTML += `
                <div class="calendar-day"
                     style="background-color: rgba(90, 135, 106, ${alpha});"
                     title="${tempDate.toLocaleDateString('zh-CN')}: ${activityCount} 次学习">
                </div>
            `;
            tempDate.setDate(tempDate.getDate() + 1);
        }

        calendarHTML += `   </div> <!-- end calendar-grid -->
                        </div> <!-- end calendar-heatmap-container -->`;

        container.innerHTML = calendarHTML;
    }

    updateAchievements() {
        if (!this.achievementsList || !window.progressManager || !window.AppConfig || !window.AppConfig.ACHIEVEMENT_DEFINITIONS) {
            this.achievementsList.innerHTML = '<p style="text-align:center;padding:20px;">成就数据加载失败。</p>';
            return;
        }

        const stats = window.progressManager.getUserStatistics();
        const achievementsUnlockedIds = new Set(stats.achievements || []);
        const allAchievements = window.AppConfig.ACHIEVEMENT_DEFINITIONS;

        let html = '<div class="achievements-list-container two-column-achievements">';

        allAchievements.forEach(achievement => {
            const isUnlocked = achievementsUnlockedIds.has(achievement.id);
            let progressDisplayHTML = '';
            let currentVal = 0;
            let targetVal = achievement.target || 0;
            let itemClass = 'achievement-item';

            if (isUnlocked) {
                itemClass += ' unlocked';
                if (achievement.currentGetter && typeof window.progressManager.getCurrentAchievementValue === 'function') {
                    currentVal = window.progressManager.getCurrentAchievementValue(achievement.id);
                     let displayVal = achievement.type === 'percentage' ? parseFloat(currentVal.toFixed(1)) : Math.floor(currentVal);
                    progressDisplayHTML = `<span class="achievement-item-progress-text done">已达成 (${displayVal}${achievement.unit || ''})</span>`;
                } else {
                    progressDisplayHTML = `<span class="achievement-item-progress-text done">已达成</span>`;
                }
            } else {
                itemClass += ' locked';
                if (typeof window.progressManager.getCurrentAchievementValue === 'function' &&
                    targetVal > 0 &&
                    achievement.type !== 'flag' &&
                    achievement.type !== 'flag_count_based' &&
                    achievement.type !== 'subject_expert' &&
                    achievement.type !== 'streak_complex') {

                    currentVal = window.progressManager.getCurrentAchievementValue(achievement.id);
                    let currentValDisplay = achievement.type === 'percentage' ? parseFloat(currentVal.toFixed(1)) : Math.floor(currentVal);
                    const percentage = Math.min((currentVal / targetVal) * 100, 100);

                    progressDisplayHTML = `
                        <div class="achievement-item-progress-bar">
                            <div class="achievement-item-progress-fill" style="width: ${percentage.toFixed(1)}%;"></div>
                        </div>
                        <span class="achievement-item-progress-text">${currentValDisplay}${achievement.unit || ''} / ${targetVal}${achievement.unit || ''}</span>
                    `;
                } else if (achievement.type === 'subject_expert' && !isUnlocked && typeof window.progressManager.getCurrentAchievementValue === 'function') {
                     const s = stats.subjectStats?.[achievement.subjectId];
                     const completedQuizzes = s?.completedQuizIds?.length || 0;
                     const currentAccuracy = (s && s.totalAnswered > 0) ? parseFloat((s.totalCorrect / s.totalAnswered * 100).toFixed(1)) : 0;
                     progressDisplayHTML = `
                        <span class="achievement-item-progress-text">
                            题库: ${completedQuizzes}/${achievement.target}, 正确率: ${currentAccuracy}% (目标: ${achievement.accuracyTarget}%)
                        </span>`;
                } else if ((achievement.type === 'flag' || achievement.type === 'flag_count_based') && targetVal === 1) {
                     progressDisplayHTML = `<span class="achievement-item-progress-text">0 / 1</span>`;
                } else {
                     progressDisplayHTML = `<span class="achievement-item-progress-text">待解锁</span>`;
                }
            }

            html += `
                <div class="${itemClass}">
                    <div class="achievement-item-icon">${achievement.icon}</div>
                    <div class="achievement-item-content">
                        <h4 class="achievement-item-name">${achievement.name}</h4>
                        <p class="achievement-item-description">${achievement.description}</p>
                        ${progressDisplayHTML}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        const unlockedCount = achievementsUnlockedIds.size;
        const totalCount = allAchievements.length;
        const overallProgressPercent = totalCount > 0 ? (unlockedCount / totalCount * 100).toFixed(1) : 0;

        const headerHTML = `
            <div class="achievements-header">
                <h3>学习成就 ${unlockedCount}/${totalCount}</h3>
                <div class="achievements-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${overallProgressPercent}%"></div>
                    </div>
                    <span class="progress-text">${overallProgressPercent}%</span>
                </div>
            </div>
        `;

        this.achievementsList.innerHTML = headerHTML + html;
    }

    refreshStatistics() {
        if (window.progressManager && typeof window.progressManager.calculateUserStatistics === 'function') {
            window.progressManager.calculateUserStatistics(true);
        }
        this.updateOverviewStats();
        this.updateCharts();
        this.updateAchievements();

        // MODIFIED: Use uiManager.showToast if available, otherwise fallback or remove this.showMessage
        if (window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('统计数据已更新', 'success');
        } else {
            this.showMessage('统计数据已更新', 'success'); // Fallback if uiManager is not ready or doesn't have showToast
        }
    }

    exportStatistics() {
        if (!window.progressManager || !window.progressManager.isInitialized()) {
            // MODIFIED: Use uiManager.showToast
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast('无数据可导出', 'error');
            } else {
                this.showMessage('无数据可导出', 'error');
            }
            return;
        }

        const analytics = window.progressManager.getStudyAnalytics();
        const stats = window.progressManager.getUserStatistics();

        const exportData = {
            exportTime: new Date().toISOString(),
            overview: stats,
            dailyAnalytics: analytics.daily,
            subjectAnalytics: analytics.subjects,
            difficultyAnalytics: analytics.difficulty,
            summary: {
                // MODIFIED: Use Utils.formatTime
                totalStudyTimeFormatted: Utils.formatTime(stats.totalTime),
                totalEffectiveStudyTimeFormatted: Utils.formatTime(stats.totalEffectiveStudyTime || 0),
                averageTimePerQuestionFormatted: Utils.formatTime(stats.averageTime),
                currentStudyStreak: stats.streakCount,
                maxStudyStreak: stats.maxStreak,
                totalStudyDays: stats.studyDays
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `study_statistics_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // MODIFIED: Use uiManager.showToast
        if (window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('统计数据已导出', 'success');
        } else {
            this.showMessage('统计数据已导出', 'success');
        }
    }

    generateStudyReport() {
        if (!window.progressManager || !window.progressManager.isInitialized()) {
            return '无法生成报告：无学习数据。';
        }

        const stats = window.progressManager.getUserStatistics();
        const analytics = window.progressManager.getStudyAnalytics();
        const reportDate = new Date().toLocaleDateString();
        const studyPeriod = stats.studyDays > 0 ? `${stats.studyDays} 天` : '今日开始';

        let report = `学习报告 - ${reportDate}\n\n`;
        report += `📊 学习概览\n`;
        report += `-------------------------------------\n`;
        report += `学习周期: ${studyPeriod}\n`;
        report += `完成测验 (用户): ${stats.totalQuizzes || 0} 个\n`;
        report += `已掌握独立题库: ${stats.completedUniqueQuizzesCount || 0} 个\n`;
        report += `总题库数 (系统): ${stats.totalUniqueQuizzesInSystem || 0} 个\n`;
        report += `总题目数 (系统): ${stats.totalQuestionsInSystem || 0} 道\n`;
        report += `总回答题目数 (用户): ${stats.totalQuestions || 0} 道\n`;
        report += `  其中答对: ${stats.totalCorrect || 0} 道\n`;
        report += `  其中答错: ${stats.totalIncorrect || 0} 道\n`;
        report += `整体正确率: ${(stats.accuracy || 0).toFixed(1)}%\n`;
        report += `当前学习连胜天数: ${stats.streakCount || 0} 天\n`;
        report += `最长学习连胜天数: ${stats.maxStreak || 0} 天\n\n`;

        report += `⏱️ 时间统计\n`;
        report += `-------------------------------------\n`;
        // MODIFIED: Use Utils.formatTime
        report += `总学习时长 (原始): ${Utils.formatTime(stats.totalTime)}\n`;
        report += `总有效学习时长: ${Utils.formatTime(stats.totalEffectiveStudyTime || 0)}\n`;
        report += `平均每题用时 (原始): ${Utils.formatTime(stats.averageTime)}\n\n`;

        report += `🎯 学习表现建议\n`;
        report += `-------------------------------------\n`;
        if (stats.accuracy >= 90) {
            report += "- ✅ 表现卓越！正确率持续保持在90%以上，知识掌握非常扎实。\n";
        } else if (stats.accuracy >= 80) {
            report += "- 👍 非常棒！正确率达到80%以上，继续保持！\n";
        } else if (stats.accuracy >= 60) {
            report += "- 📈 还有提升空间！正确率介于60-80%，可针对性复习错题，加强薄弱环节。\n";
        } else {
            report += "- 💪 加油！正确率低于60%，建议系统复习基础知识，多做练习，并仔细分析错题原因。\n";
        }
        if ((stats.streakCount || 0) >= 7) {
            report += `- 🔥 连续学习 ${(stats.streakCount || 0)} 天，毅力可嘉，请继续保持这个好习惯！\n`;
        }
        report += "\n";

        if (analytics.subjects && analytics.subjects.length > 0) {
            report += `📚 学科掌握情况 (基于测验)\n`;
            report += `-------------------------------------\n`;
            analytics.subjects.forEach(s => {
                const subjectName = window.dataManager?.getQuizById(s.subjectId)?.name ||
                                    (window.dataManager?.getData()[s.subjectId]?.name || s.subjectId);
                report += `- ${subjectName}: ${s.quizCount}个测验, 平均正确率${s.accuracy.toFixed(1)}%\n`;
            });
            report += "\n";
        }

        if (stats.achievements && stats.achievements.length > 0) {
            report += `🏆 已获得成就 (${stats.achievements.length}个)\n`;
            report += `-------------------------------------\n`;
            report += `继续努力，解锁更多成就！\n\n`;
        } else {
            report += `🏆 成就系统\n`;
            report += `-------------------------------------\n`;
            report += `暂未解锁成就，完成目标即可点亮它们！\n\n`;
        }

        report += `报告生成时间: ${new Date().toLocaleString()}\n`;
        return report;
    }

    // DELETED: formatTime method, now using Utils.formatTime

    showMessage(message, type = 'info') { // This is now a fallback if uiManager.showToast is not available
        const messageContainer = document.getElementById('globalMessageArea') || document.body;

        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        messageDiv.style.color = 'white';

        if (type === 'success') {
            messageDiv.style.backgroundColor = 'var(--success-color, #4CAF50)';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = 'var(--error-color, #F44336)';
        } else { // info
            messageDiv.style.backgroundColor = 'var(--primary-color, #2196F3)';
        }

        messageDiv.className = `stats-message ${type}`;
        messageDiv.textContent = message;

        messageContainer.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    cleanup() {
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.chartInstances = {};
        console.log("Chart instances cleaned up.");
    }

    getLatestReportDataForAI() {
        if (!window.progressManager || !window.progressManager.isInitialized()) {
            console.warn("StatisticsManager: ProgressManager not ready for AI report data.");
            return null;
        }
        try {
            const stats = window.progressManager.getUserStatistics();
            const analytics = window.progressManager.getStudyAnalytics();

            if (!stats || !analytics) {
                console.warn("StatisticsManager: Failed to get stats or analytics for AI report.");
                return null;
            }

            const reportObject = {
                exportTime: new Date().toISOString(),
                userOverallStats: {
                    totalQuizzesAttempted: stats.totalQuizzes || 0,
                    totalQuestionsAnswered: stats.totalQuestions || 0,
                    totalCorrectAnswers: stats.totalCorrect || 0,
                    totalIncorrectAnswers: stats.totalIncorrect || 0,
                    overallAccuracyPercent: parseFloat((stats.accuracy || 0).toFixed(1)),
                    totalStudyTimeRawMs: stats.totalTime || 0,
                    totalEffectiveStudyTimeMs: stats.totalEffectiveStudyTime || 0,
                    // MODIFIED: Use Utils.formatTime
                    totalEffectiveStudyTimeFormatted: Utils.formatTime(stats.totalEffectiveStudyTime || 0),
                    averageTimePerQuestionMs: parseFloat((stats.averageTime || 0).toFixed(0)),
                    currentStudyStreakDays: stats.streakCount || 0,
                    maxStudyStreakDays: stats.maxStreak || 0,
                    totalUniqueStudyDays: stats.studyDays || 0,
                    uniqueQuizzesCompletedCount: stats.completedUniqueQuizzesCount || 0,
                    achievementsUnlockedCount: (stats.achievements || []).length,
                    dailyQuizConsecutiveDays: stats.dailyQuizConsecutiveDays || 0,
                    incorrectQuestionsMasteredCount: stats.incorrectQuestionsMasteredCount || 0,
                },
                recentDailyPerformance: (analytics.daily || []).slice(-7).map(d => ({
                    date: d.date,
                    quizzesDone: d.quizCount,
                    questionsAnswered: d.totalQuestions,
                    accuracyPercent: parseFloat(d.accuracy.toFixed(1)),
                    avgTimePerQuestionSec: parseFloat((d.averageTimePerQuestion / 1000).toFixed(1))
                })),
                subjectPerformanceSummary: (analytics.subjects || []).map(s => ({
                    subjectId: s.subjectId,
                    subjectName: window.dataManager?.getData()?.[s.subjectId]?.name || s.subjectId,
                    quizAttempts: s.quizCount,
                    totalQuestionsInSubjectAttempts: s.totalQuestions,
                    accuracyPercent: parseFloat(s.accuracy.toFixed(1))
                })),
                difficultyBreakdownOfRecentActivity: analytics.difficulty || { easy: 0, medium: 0, hard: 0 },
                incorrectQuestionsOverview: {
                    totalInBook: window.reviewManager?.currentIncorrectQuestions?.length || (window.progressManager?.getIncorrectQuestions({})?.length || 0),
                    markedCount: window.reviewManager?.currentIncorrectQuestions?.filter(q=>q.isMarked).length || 0,
                    needsReviewCount: window.reviewManager?.currentIncorrectQuestions?.filter(q => (q.masteryLevel || 0) < 3).length || 0,
                },
            };
            return reportObject;
        } catch (e) {
            console.error("StatisticsManager: Error generating report data for AI:", e);
            return null;
        }
    }
}

if (typeof window !== 'undefined' && typeof Chart !== 'undefined') {
    window.statisticsManager = new StatisticsManager();
} else if (typeof window !== 'undefined') {
    console.warn("StatisticsManager: Chart.js not found. Charts will not be rendered.");
    window.statisticsManager = new StatisticsManager();
}
