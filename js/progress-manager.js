// --- START OF FILE progress-manager.js (MODIFIED) ---

/**
 * 学习助手应用 - 进度管理模块
 * 负责用户学习进度、做题历史、错题记录等数据的管理
 */

class ProgressManager {
    constructor() {
        this.userProgressKey = 'userProgress'; // Default, will be prefixed by AppConfig.storageKey for localStorage fallback
        this.userProgress = null;
        this.initialized = false;
        this.fullStorageKey = null; // For localStorage fallback

        this._tryInitialize();
    }

    async _tryInitialize() {
        if (window.AppConfig && window.dataManager && window.dataManager.isInitialized && window.dataManager.isInitialized()) {
            await this.init();
        } else {
            setTimeout(() => this._tryInitialize(), 100);
        }
    }

    async init() {
        if (this.initialized) return;

        try {
            if (!window.AppConfig || !window.dataManager || !window.dataManager.isInitialized()) {
                console.warn('ProgressManager init: Dependencies (AppConfig/DataManager) still not ready. Aborting init for now.');
                return;
            }

            if (!window.AppConfig.APP_CONFIG || !window.AppConfig.APP_CONFIG.storageKey) {
                console.error("ProgressManager init: AppConfig.APP_CONFIG.storageKey is not defined! Will use default structure and may not persist correctly with localStorage fallback.");
                this.userProgress = this.getDefaultProgressStructure();
            } else {
                 this.fullStorageKey = window.AppConfig.APP_CONFIG.storageKey + '_' + this.userProgressKey;
            }

            if (window.storageManager && typeof window.storageManager.init === 'function' && !window.storageManager.isInitialized) {
                await window.storageManager.init();
            }

            await this.loadUserProgress();
            this.ensureProgressDataIntegrity();
            await this.saveUserProgress();

            this.initialized = true;
            const storageType = window.storageManager ?
                                (window.storageManager.fallbackToLocalStorage ? 'localStorage (via SM fallback)' : 'IndexedDB (via SM)') :
                                'localStorage (direct)';
            console.log(`✅ ProgressManager initialized successfully using ${storageType}`);
        } catch (error) {
            console.error('❌ ProgressManager initialization failed:', error);
            this.userProgress = this.getDefaultProgressStructure();
            this.initialized = true;
        }
    }

    getDefaultProgressStructure() {
        return {
            statistics: {
                totalQuestions: 0,
                totalCorrect: 0,
                totalIncorrect: 0,
                totalTime: 0,
                totalEffectiveStudyTime: 0,
                averageTime: 0,
                accuracy: 0,
                streakCount: 0,
                maxStreak: 0,
                lastStudyDate: null,
                studyDays: 0,
                totalQuizzes: 0,
                lastDailyQuizDate: null,
                achievements: [],
                completedQuizIds: [],
                firstDailyQuizDone: false,
                firstReviewPracticeDone: false,
                quizzesWithPerfectScore: 0,
                hardQuizzesWithPerfectScore: 0,
                noMistakesStreak: 0,
                maxNoMistakesStreak: 0,
                dailyQuizConsecutiveDays: 0,
                lastDailyQuizCompletionDate: null,
                subjectStats: {},
                periodStats: {},
                incorrectQuestionsMasteredCount: 0,
                incorrectQuestionsClearedCount: 0,
                reviewPracticeCount: 0
            },
            history: [],
            incorrectQuestions: [],
            preferences: {
                autoSaveIncorrect: true,
                showDetailedStats: true,
                reviewReminders: true
            }
        };
    }

    async loadUserProgress() {
        try {
            if (window.storageManager && typeof window.storageManager.getItem === 'function') {
                const savedData = await window.storageManager.getItem('userProgress', 'main');
                this.userProgress = savedData || this.getDefaultProgressStructure();
            } else {
                console.warn('ProgressManager: StorageManager not found, falling back to localStorage for loading.');
                if (!this.fullStorageKey) {
                     console.error("ProgressManager loadUserProgress (localStorage fallback): fullStorageKey not set. This indicates an init problem.");
                     this.userProgress = this.getDefaultProgressStructure();
                     return;
                }
                const savedData = localStorage.getItem(this.fullStorageKey);
                this.userProgress = savedData ? JSON.parse(savedData) : this.getDefaultProgressStructure();
            }
        } catch (error) {
            console.error('加载用户进度数据失败:', error);
            this.userProgress = this.getDefaultProgressStructure();
        }
    }

    async saveUserProgress() {
        if (!this.initialized) {
            return;
        }
        try {
            if (window.storageManager && typeof window.storageManager.setItem === 'function') {
                await window.storageManager.setItem('userProgress', 'main', this.userProgress);
            } else {
                console.warn('ProgressManager: StorageManager not found, falling back to localStorage for saving.');
                if (!this.fullStorageKey) {
                     console.error("ProgressManager saveUserProgress (localStorage fallback): fullStorageKey not set.");
                     return;
                }
                localStorage.setItem(this.fullStorageKey, JSON.stringify(this.userProgress));
            }
        } catch (error) {
            console.error('保存用户进度数据失败 (primary attempt):', error);
            if (this.fullStorageKey) {
                try {
                    localStorage.setItem(this.fullStorageKey + '_emergency_backup', JSON.stringify(this.userProgress));
                    console.warn('用户进度已紧急备份到localStorage:', this.fullStorageKey + '_emergency_backup');
                } catch (emergencyError) {
                    console.error('localStorage紧急备份也失败:', emergencyError);
                }
            }
        }
    }

    // --- NEW METHOD START ---
    // 这个新方法就是为了从备份文件中恢复你的学习记录
    /**
     * 新增：用于从备份恢复用户进度数据
     * @param {object} progressData - 从备份文件解析出的用户进度对象
     */
    async restoreProgress(progressData) {
        if (!progressData || !progressData.statistics || !progressData.history) {
            throw new Error("要恢复的用户进度数据格式无效。");
        }
        
        // 直接用备份的数据替换当前的 userProgress 对象
        this.userProgress = progressData;
        
        // 确保新加载的数据结构完整，以防是旧版备份
        this.ensureProgressDataIntegrity();
        
        // 将恢复后的数据立即保存到存储中
        await this.saveUserProgress();

        console.log("✅ 用户进度数据已从备份恢复并保存。");
    }
    // --- NEW METHOD END ---

    ensureProgressDataIntegrity() {
        const defaultStructure = this.getDefaultProgressStructure();
        if (!this.userProgress) {
            this.userProgress = JSON.parse(JSON.stringify(defaultStructure));
            return;
        }
        if (!this.userProgress.statistics) this.userProgress.statistics = { ...defaultStructure.statistics };
        if (!this.userProgress.history) this.userProgress.history = [];
        if (!this.userProgress.incorrectQuestions) this.userProgress.incorrectQuestions = [];
        if (!this.userProgress.preferences) this.userProgress.preferences = { ...defaultStructure.preferences };
        const defaultStats = defaultStructure.statistics;
        for (const key in defaultStats) {
            if (this.userProgress.statistics[key] === undefined) {
                this.userProgress.statistics[key] = defaultStats[key];
            }
        }
        if (typeof this.userProgress.statistics.subjectStats !== 'object' || this.userProgress.statistics.subjectStats === null) {
            this.userProgress.statistics.subjectStats = {};
        }
        if (typeof this.userProgress.statistics.periodStats !== 'object' || this.userProgress.statistics.periodStats === null) {
            this.userProgress.statistics.periodStats = {};
        }
    }

    async recordQuizResult(quizResult) {
        if (!this.initialized || !quizResult || typeof quizResult.quizId === 'undefined') return;

        try {
            const stats = this.userProgress.statistics;
            // MODIFIED: Use Utils.generateId
            const resultId = Utils.generateId();
            const maxAllowedTimeForQuiz = quizResult.totalQuestions * 30000;
            const effectiveQuizTime = Math.min(quizResult.timeSpent, maxAllowedTimeForQuiz);

            stats.totalEffectiveStudyTime = (stats.totalEffectiveStudyTime || 0) + effectiveQuizTime;
            if (!stats.completedQuizIds.includes(quizResult.quizId)) {
                stats.completedQuizIds.push(quizResult.quizId);
            }

            const historyRecord = {
                id: resultId,
                quizId: quizResult.quizId,
                subjectId: quizResult.subjectId,
                periodId: quizResult.periodId,
                quizName: quizResult.quizName,
                startTime: quizResult.startTime,
                endTime: quizResult.endTime,
                totalQuestions: quizResult.totalQuestions,
                correctAnswers: quizResult.correctAnswers,
                incorrectAnswers: quizResult.incorrectAnswers,
                accuracy: quizResult.accuracy,
                timeSpent: quizResult.timeSpent,
                effectiveTimeSpent: effectiveQuizTime,
                questionResults: quizResult.questionResults || [],
                isDailyTest: !!quizResult.isDailyTest,
                difficulty: quizResult.difficulty || null,
                quizType: quizResult.quizType // Persist quizType in history
            };
            this.userProgress.history.unshift(historyRecord);
            if (this.userProgress.history.length > 500) this.userProgress.history.pop();

            if (this.userProgress.preferences.autoSaveIncorrect && quizResult.questionResults) {
                this.recordIncorrectQuestions(quizResult);
            }

            this.updateStatistics(quizResult);

            const subjectId = quizResult.subjectId;
            if (subjectId && !quizResult.isDailyTest) {
                stats.subjectStats[subjectId] = stats.subjectStats[subjectId] || { completedQuizIds: [], totalAnswered: 0, totalCorrect: 0, quizAttempts: 0 };
                if (!stats.subjectStats[subjectId].completedQuizIds.includes(quizResult.quizId)) {
                    stats.subjectStats[subjectId].completedQuizIds.push(quizResult.quizId);
                }
                stats.subjectStats[subjectId].totalAnswered += quizResult.totalQuestions;
                stats.subjectStats[subjectId].totalCorrect += quizResult.correctAnswers;
                stats.subjectStats[subjectId].quizAttempts +=1;
            }

            const periodId = quizResult.periodId;
            if (periodId && subjectId && !quizResult.isDailyTest) {
                if (subjectId === 'western_art') {
                    if (['early_renaissance', 'high_renaissance', 'northern_renaissance'].includes(periodId)) {
                        stats.periodStats['renaissance'] = stats.periodStats['renaissance'] || { completedQuizIds: [] };
                        if (!stats.periodStats['renaissance'].completedQuizIds.includes(quizResult.quizId)) {
                            stats.periodStats['renaissance'].completedQuizIds.push(quizResult.quizId);
                        }
                    }
                    if (['impressionism', 'post_impressionism'].includes(periodId)) {
                        stats.periodStats['impressionism_related'] = stats.periodStats['impressionism_related'] || { completedQuizIds: [] };
                        if (!stats.periodStats['impressionism_related'].completedQuizIds.includes(quizResult.quizId)) {
                            stats.periodStats['impressionism_related'].completedQuizIds.push(quizResult.quizId);
                        }
                    }
                }
                if (subjectId === 'chinese_art') {
                    const ancientPeriods = ['prehistoric', 'xia_shang', 'zhou', 'spring_autumn', 'warring_states', 'qin', 'han', 'three_kingdoms', 'jin', 'southern_northern', 'sui', 'tang'];
                    if (ancientPeriods.includes(periodId)) {
                        stats.periodStats['ancient_china'] = stats.periodStats['ancient_china'] || { completedQuizIds: [] };
                         if (!stats.periodStats['ancient_china'].completedQuizIds.includes(quizResult.quizId)) {
                            stats.periodStats['ancient_china'].completedQuizIds.push(quizResult.quizId);
                        }
                    }
                }
            }

            if (quizResult.accuracy === 100 && quizResult.totalQuestions >= 10) {
                stats.quizzesWithPerfectScore = (stats.quizzesWithPerfectScore || 0) + 1;
                if (quizResult.difficulty === 'hard') {
                    stats.hardQuizzesWithPerfectScore = (stats.hardQuizzesWithPerfectScore || 0) + 1;
                }
            }

            if (quizResult.incorrectAnswers === 0) {
                stats.noMistakesStreak = (stats.noMistakesStreak || 0) + 1;
                stats.maxNoMistakesStreak = Math.max(stats.maxNoMistakesStreak || 0, stats.noMistakesStreak);
            } else {
                stats.noMistakesStreak = 0;
            }

            if (quizResult.isDailyTest) {
                stats.firstDailyQuizDone = true;
                const todayStr = new Date().toDateString();
                if (stats.lastDailyQuizCompletionDate) {
                    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
                    if (stats.lastDailyQuizCompletionDate === yesterdayStr) {
                        stats.dailyQuizConsecutiveDays = (stats.dailyQuizConsecutiveDays || 0) + 1;
                    } else if (stats.lastDailyQuizCompletionDate !== todayStr) {
                        stats.dailyQuizConsecutiveDays = 1;
                    }
                } else {
                    stats.dailyQuizConsecutiveDays = 1;
                }
                stats.lastDailyQuizCompletionDate = todayStr;
            }

            this.checkAchievements();
            await this.saveUserProgress();
            console.log('Quiz result recorded and extended stats updated:', historyRecord.quizName);
        } catch (error) {
            console.error('记录测试结果失败:', error);
        }
    }

    recordIncorrectQuestions(quizResult) {
        if (!quizResult.questionResults || quizResult.questionResults.length === 0) return;
        const incorrectOnly = quizResult.questionResults.filter(q => !q.isCorrect);
        if (incorrectOnly.length === 0) return;

        let addedCount = 0;
        let duplicateCount = 0;

        incorrectOnly.forEach(questionResult => {
            if (!questionResult.question || !questionResult.options) { // options might be null for essay, check if needed
                console.warn("Skipping incomplete questionResult for incorrect questions:", questionResult);
                return;
            }

            // MODIFICATION START: Updated incorrectQuestionEntry structure
            const incorrectQuestionEntry = {
                id: Utils.generateId(), // 已使用 Utils.generateId
                quizId: quizResult.quizId,
                subjectId: questionResult.subjectId || quizResult.subjectId,
                periodId: questionResult.periodId || quizResult.periodId,
                quizName: quizResult.quizName,
                questionIndex: questionResult.questionIndex,
                question: questionResult.question, // This is the essay prompt
                options: questionResult.options, // For essay_ai_feedback, this will be ["感觉良好", "仍需复习"]
                correctAnswer: questionResult.correctAnswer, // For essay_ai_feedback, this is the index for "感觉良好"
                userAnswer: questionResult.userAnswer, // User's choice (index for "感觉良好" or "仍需复习")
                explanation: questionResult.explanation, // This is the AI's feedback on the user's essay
                section: questionResult.section,
                // 新增，为 essay_ai_feedback 类型题目保存 modelAnswer 和 quizType
                modelAnswer: (quizResult.quizType === "essay_ai_feedback" ? questionResult.modelAnswer : undefined), // This is the general model answer / AI's original essay.
                quizType: quizResult.quizType, // 保存题库类型, e.g., "essay_ai_feedback"

                addedDate: new Date().toISOString(),
                reviewCount: 0,
                lastReviewDate: null,
                isMarked: false,
                masteryLevel: 0
            };
            // MODIFICATION END

            const exists = this.userProgress.incorrectQuestions.some(iq =>
                iq.question === incorrectQuestionEntry.question && // For essays, question (prompt) might be long. Consider a more robust check if needed.
                iq.quizId === incorrectQuestionEntry.quizId &&
                iq.questionIndex === incorrectQuestionEntry.questionIndex &&
                iq.quizType === incorrectQuestionEntry.quizType // Add quizType to uniqueness check
            );

            if (!exists) {
                this.userProgress.incorrectQuestions.unshift(incorrectQuestionEntry);
                addedCount++;
            } else {
                duplicateCount++;
            }
        });
        if (this.userProgress.incorrectQuestions.length > 1000) {
            this.userProgress.incorrectQuestions = this.userProgress.incorrectQuestions.slice(0, 1000);
             console.log(`📝 错题数量超限，已清理旧错题`);
        }
        if (addedCount > 0 || duplicateCount > 0) {
            console.log(`错题记录: 新增 ${addedCount}, 跳过重复 ${duplicateCount}. 总错题数: ${this.userProgress.incorrectQuestions.length}`);
        }
    }

    updateStatistics(quizResult) {
        const stats = this.userProgress.statistics;
        // Note: As per instructions, essay_ai_feedback questions currently count towards general stats
        // like regular questions. "感觉良好" is correct, "仍需复习" is incorrect.
        stats.totalQuestions += quizResult.totalQuestions;
        stats.totalCorrect += quizResult.correctAnswers;
        stats.totalIncorrect += quizResult.incorrectAnswers;
        stats.totalTime += quizResult.timeSpent;
        stats.totalQuizzes += 1;
        stats.accuracy = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;
        stats.averageTime = stats.totalQuestions > 0 ? stats.totalTime / stats.totalQuestions : 0;
        if (quizResult.accuracy >= 80) {
            stats.streakCount += 1;
            stats.maxStreak = Math.max(stats.maxStreak, stats.streakCount);
        } else if (stats.streakCount > 0) {
            stats.streakCount = 0;
        }
        const today = new Date().toDateString();
        const lastStudy = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
        if (lastStudy !== today) {
            stats.studyDays += 1;
            stats.lastStudyDate = new Date().toISOString();
        }
    }

    checkAchievements() {
        if (!this.userProgress || !this.userProgress.statistics || !window.AppConfig || !window.AppConfig.ACHIEVEMENT_DEFINITIONS) {
            console.warn("Cannot check achievements: Missing user progress or achievement definitions.");
            return;
        }
        const stats = this.userProgress.statistics;
        const currentAchievements = new Set(stats.achievements || []);
        const newAchievementsToNotify = [];
        const achievementDefinitions = window.AppConfig.ACHIEVEMENT_DEFINITIONS;
        achievementDefinitions.forEach(achDef => {
            if (currentAchievements.has(achDef.id)) return;
            let conditionMet = false;
            try {
                switch (achDef.type) {
                    case 'count':
                        if (achDef.id.startsWith('quiz_attempts_')) conditionMet = stats.totalQuizzes >= achDef.target;
                        else if (achDef.id.startsWith('question_answered_')) conditionMet = stats.totalQuestions >= achDef.target;
                        else if (achDef.id.startsWith('completed_unique_quizzes_')) conditionMet = stats.completedQuizIds.length >= achDef.target;
                        else if (achDef.id === 'perfect_quiz_10_plus') conditionMet = (stats.quizzesWithPerfectScore || 0) >= achDef.target;
                        else if (achDef.id === 'perfect_quiz_hard') conditionMet = (stats.hardQuizzesWithPerfectScore || 0) >= achDef.target;
                        else if (achDef.id === 'no_mistakes_streak_3') conditionMet = (stats.maxNoMistakesStreak || 0) >= achDef.target;
                        else if (achDef.id.startsWith('streak_accuracy_80_')) conditionMet = (stats.maxStreak || 0) >= achDef.target;
                        else if (achDef.id.startsWith('study_days_')) conditionMet = stats.studyDays >= achDef.target;
                        else if (achDef.id.startsWith('daily_quiz_streak_')) conditionMet = (stats.dailyQuizConsecutiveDays || 0) >= achDef.target;
                        else if (achDef.id.startsWith('master_incorrect_')) conditionMet = (stats.incorrectQuestionsMasteredCount || 0) >= achDef.target;
                        else if (achDef.id === 'review_guru') conditionMet = (stats.reviewPracticeCount || 0) >= achDef.target;
                        else console.warn(`Unhandled count type for achievement ID: ${achDef.id}`);
                        break;
                    case 'flag':
                        if (achDef.id === 'daily_first_try') conditionMet = stats.firstDailyQuizDone;
                        else if (achDef.id === 'review_first_time') conditionMet = stats.firstReviewPracticeDone;
                        else console.warn(`Unhandled flag type for achievement ID: ${achDef.id}`);
                        break;
                    case 'percentage':
                        if (achDef.id.startsWith('accuracy_overall_')) conditionMet = stats.accuracy >= achDef.target;
                        else console.warn(`Unhandled percentage type for achievement ID: ${achDef.id}`);
                        break;
                    case 'streak_complex':
                        conditionMet = (stats.maxStreak >= 10 && stats.accuracy >= 90);
                        if (achDef.id === 'streak_accuracy_90_3') {
                            let consecutiveHighAccuracyQuizzes = 0;
                            for (const quizRecord of this.userProgress.history) {
                                if (quizRecord.accuracy >= 90) {
                                    consecutiveHighAccuracyQuizzes++;
                                    if (consecutiveHighAccuracyQuizzes >= achDef.target) {
                                        conditionMet = true;
                                        break;
                                    }
                                } else break;
                            }
                        }
                        break;
                    case 'subject_expert':
                        const s = stats.subjectStats?.[achDef.subjectId];
                        if (s && s.completedQuizIds && s.quizAttempts > 0) {
                            const accuracy = s.totalAnswered > 0 ? (s.totalCorrect / s.totalAnswered * 100) : 0;
                            conditionMet = s.completedQuizIds.length >= achDef.target && accuracy >= achDef.accuracyTarget;
                        }
                        break;
                    case 'period_count':
                        conditionMet = (stats.periodStats?.[achDef.periodKey]?.completedQuizIds.length || 0) >= achDef.target;
                        break;
                    case 'flag_count_based':
                        if (achDef.statKey === 'incorrectQuestionsClearedCount') {
                            conditionMet = (stats.incorrectQuestionsClearedCount || 0) >= achDef.target && this.userProgress.incorrectQuestions.length === 0;
                        }
                        break;
                    default:
                        console.warn(`Unknown achievement type: ${achDef.type} for ID: ${achDef.id}`);
                }
            } catch (e) { console.error(`Error evaluating condition for achievement ${achDef.id}:`, e); }
            if (conditionMet) {
                currentAchievements.add(achDef.id);
                newAchievementsToNotify.push({
                    id: achDef.id, name: achDef.name, description: achDef.description, icon: achDef.icon
                });
            }
        });
        stats.achievements = Array.from(currentAchievements);
        if (newAchievementsToNotify.length > 0) this.notifyNewAchievements(newAchievementsToNotify);
    }

    notifyNewAchievements(achievements) {
        achievements.forEach(achievement => {
            console.log(`🏆 获得新成就: ${achievement.name} - ${achievement.description}`);
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast(`🏆 新成就解锁: ${achievement.name}!`, 'success');
            }
        });
        if (window.uiManager && typeof window.uiManager.displayAchievementNotification === 'function') {
            window.uiManager.displayAchievementNotification(achievements);
        }
    }

    getUserStatistics() {
        if (!this.userProgress || !this.userProgress.statistics) {
            return { ...this.getDefaultProgressStructure().statistics };
        }
        
        const statsCopy = { ...this.userProgress.statistics };
        const completedIds = statsCopy.completedQuizIds || [];

        // Check if dataManager is available and initialized before proceeding
        if (window.dataManager && typeof window.dataManager.isInitialized === 'function' && window.dataManager.isInitialized()) {
            
            // Calculate "Completed User Quizzes" based on official quiz IDs
            // This is for the "已完成题库 (用户)" stat
            if (typeof window.dataManager.getOfficialQuizIdsSet === 'function') {
                const officialQuizIds = window.dataManager.getOfficialQuizIdsSet();
                statsCopy.completedUniqueQuizzesCount = completedIds.filter(id => officialQuizIds.has(id)).length;
            } else {
                // Fallback for safety, though the method should exist
                statsCopy.completedUniqueQuizzesCount = completedIds.length;
                console.warn("ProgressManager: dataManager.getOfficialQuizIdsSet() not found. 'Completed Quizzes' stat will count all quizzes.");
            }
            
            // Calculate "Total System Quizzes" and "Total System Questions"
            // This is for "总题库数 (系统)" and "总题目数 (系统)" stats
            if (typeof window.dataManager.getOfficialDataStatistics === 'function') {
                const systemStats = window.dataManager.getOfficialDataStatistics();
                statsCopy.totalUniqueQuizzesInSystem = systemStats.quizzes || 0;
                statsCopy.totalQuestionsInSystem = systemStats.questions || 0;
            } else {
                // Fallback for safety, use the old method
                const systemStats = window.dataManager.getDataStatistics();
                statsCopy.totalUniqueQuizzesInSystem = systemStats.quizzes || 0;
                statsCopy.totalQuestionsInSystem = systemStats.questions || 0;
                console.warn("ProgressManager: dataManager.getOfficialDataStatistics() not found. 'System' stats will count all data.");
            }
        } else {
            // Fallback if dataManager is not ready
            statsCopy.completedUniqueQuizzesCount = completedIds.length;
            statsCopy.totalUniqueQuizzesInSystem = 0;
            statsCopy.totalQuestionsInSystem = 0;
            console.warn("ProgressManager: DataManager not available for system stats calculation.");
        }

        return statsCopy;
    }

    getQuizHistory(limit = 50) {
        return this.userProgress ? this.userProgress.history.slice(0, limit) : [];
    }

    getIncorrectQuestions(filters = {}) {
        if (!this.userProgress || !this.userProgress.incorrectQuestions) return [];
        let questions = [...this.userProgress.incorrectQuestions];
        if (filters.subjectId) questions = questions.filter(q => q.subjectId === filters.subjectId);
        if (filters.periodId) questions = questions.filter(q => q.periodId === filters.periodId);
        if (filters.isMarked !== undefined && filters.isMarked !== null) questions = questions.filter(q => q.isMarked === filters.isMarked);
        if (filters.masteryLevel !== undefined && filters.masteryLevel !== null) {
            if (filters.masteryFilterType === 'atOrBelow') questions = questions.filter(q => q.masteryLevel <= filters.masteryLevel);
            else questions = questions.filter(q => q.masteryLevel === filters.masteryLevel);
        }
        if (filters.quizType) questions = questions.filter(q => q.quizType === filters.quizType); // Allow filtering by quizType
        return questions;
    }

    async toggleIncorrectQuestionMark(questionId) {
        const question = this.userProgress.incorrectQuestions.find(q => q.id === questionId);
        if (question) {
            question.isMarked = !question.isMarked;
            await this.saveUserProgress();
            return question.isMarked;
        }
        return false;
    }

    async updateIncorrectQuestionMastery(questionId, isCorrectInReview) {
        const question = this.userProgress.incorrectQuestions.find(q => q.id === questionId);
        if (question) {
            question.reviewCount = (question.reviewCount || 0) + 1;
            question.lastReviewDate = new Date().toISOString();
            const oldMastery = question.masteryLevel || 0;
            if (isCorrectInReview) question.masteryLevel = Math.min(5, oldMastery + 1);
            else question.masteryLevel = Math.max(0, oldMastery - 1);
            if (oldMastery < 3 && question.masteryLevel >= 3) {
                this.userProgress.statistics.incorrectQuestionsMasteredCount = (this.userProgress.statistics.incorrectQuestionsMasteredCount || 0) + 1;
            }
            await this.saveUserProgress();
            this.checkAchievements();
        }
    }

    async removeIncorrectQuestion(questionId) {
        const index = this.userProgress.incorrectQuestions.findIndex(q => q.id === questionId);
        if (index > -1) {
            this.userProgress.incorrectQuestions.splice(index, 1);
            if (this.userProgress.incorrectQuestions.length === 0) {
                this.userProgress.statistics.incorrectQuestionsClearedCount = (this.userProgress.statistics.incorrectQuestionsClearedCount || 0) + 1;
            }
            await this.saveUserProgress();
            this.checkAchievements();
            return true;
        }
        return false;
    }

    getStudyAnalytics() {
        const history = this.getQuizHistory(100);
        const stats = this.getUserStatistics();
        return {
            overview: stats,
            daily: this.getDailyStatistics(history),
            subjects: this.getSubjectStatistics(history),
            difficulty: this.getDifficultyBreakdownFromHistory(history),
            trends: this.getTimeTrends(history)
        };
    }

    getDifficultyBreakdownFromHistory(history) {
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
        if (Array.isArray(history)) {
            history.forEach(record => {
                if (record && typeof record.difficulty === 'string') {
                    const difficultyKey = record.difficulty.toLowerCase();
                    if (difficultyCounts.hasOwnProperty(difficultyKey)) difficultyCounts[difficultyKey]++;
                }
            });
        }
        return difficultyCounts;
    }

    getDailyStatistics(history) {
        const dailyData = {};
        history.forEach(record => {
            const date = new Date(record.startTime).toDateString();
            if (!dailyData[date]) {
                dailyData[date] = { date: date, quizCount: 0, totalQuestions: 0, correctAnswers: 0, totalTime: 0 };
            }
            dailyData[date].quizCount++;
            dailyData[date].totalQuestions += record.totalQuestions;
            dailyData[date].correctAnswers += record.correctAnswers;
            dailyData[date].totalTime += record.timeSpent;
        });
        return Object.values(dailyData).map(day => ({
            ...day,
            accuracy: day.totalQuestions > 0 ? (day.correctAnswers / day.totalQuestions) * 100 : 0,
            averageTimePerQuestion: day.totalQuestions > 0 ? day.totalTime / day.totalQuestions : 0
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    getSubjectStatistics(history) {
        const subjectData = {};
        history.forEach(record => {
            if (record.isDailyTest && record.questionResults && record.questionResults.length > 0) {
                record.questionResults.forEach(qr => {
                    const subjectId = qr.subjectId || 'unknown_daily_q_subject';
                    if (!subjectData[subjectId]) {
                        subjectData[subjectId] = { subjectId: subjectId, quizCount: 0, totalQuestions: 0, correctAnswers: 0, totalTime: 0, questionsFromDailyTest: 0 };
                    }
                    subjectData[subjectId].totalQuestions++;
                    subjectData[subjectId].questionsFromDailyTest++;
                    if (qr.isCorrect) subjectData[subjectId].correctAnswers++;
                });
            } else if (!record.isDailyTest) {
                const subjectId = record.subjectId || 'unknown_regular_quiz_subject';
                if (!subjectData[subjectId]) {
                    subjectData[subjectId] = { subjectId: subjectId, quizCount: 0, totalQuestions: 0, correctAnswers: 0, totalTime: 0, questionsFromDailyTest: 0 };
                }
                subjectData[subjectId].quizCount++;
                subjectData[subjectId].totalQuestions += record.totalQuestions;
                subjectData[subjectId].correctAnswers += record.correctAnswers;
                subjectData[subjectId].totalTime += record.timeSpent;
            }
        });
        return Object.values(subjectData).map(subject => ({
            ...subject,
            accuracy: subject.totalQuestions > 0 ? (subject.correctAnswers / subject.totalQuestions) * 100 : 0,
            averageTimePerQuestion: subject.totalQuestions > 0 && subject.totalTime > 0 && (subject.totalQuestions - subject.questionsFromDailyTest > 0)
                                    ? subject.totalTime / (subject.totalQuestions - subject.questionsFromDailyTest)
                                    : 0
        })).filter(subject => subject.totalQuestions > 0);
    }

    getTimeTrends(history) {
        if (history.length < 2) return { recentActivity: history.length, averageSessionLength: 0, improvementTrend: 0 };
        const last30DaysHistory = history.filter(record => {
            const recordDate = new Date(record.startTime);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return recordDate >= thirtyDaysAgo;
        });
        const totalTimeSpentRecent = last30DaysHistory.reduce((sum, r) => sum + r.timeSpent, 0);
        const avgSessionRecent = last30DaysHistory.length > 0 ? totalTimeSpentRecent / last30DaysHistory.length : 0;
        return {
            recentActivity: last30DaysHistory.length,
            averageSessionLength: avgSessionRecent,
            improvementTrend: this.calculateImprovementTrend(last30DaysHistory)
        };
    }

    calculateImprovementTrend(recentHistory) {
        if (recentHistory.length < 5) return 0;
        const halfLength = Math.floor(recentHistory.length / 2);
        const firstHalf = recentHistory.slice(0, halfLength);
        const secondHalf = recentHistory.slice(recentHistory.length - halfLength);
        const avgAccuracy = (arr) => arr.length > 0 ? arr.reduce((sum, r) => sum + r.accuracy, 0) / arr.length : 0;
        const firstHalfAvgAcc = avgAccuracy(firstHalf);
        const secondHalfAvgAcc = avgAccuracy(secondHalf);
        return secondHalfAvgAcc - firstHalfAvgAcc;
    }

    async clearAllUserData() {
        if (confirm('确定要清除所有学习记录、错题和成就吗？此操作不可恢复。')) {
            this.userProgress = this.getDefaultProgressStructure();
            await this.saveUserProgress();
            console.log('All user progress data cleared.');
            if (window.uiManager && typeof window.uiManager.refreshUI === 'function') {
                window.uiManager.refreshUI({ fullReload: true });
            }
            return true;
        }
        return false;
    }

    exportUserData() {
        if (!this.userProgress) return JSON.stringify({ error: "No user data to export." });
        const exportData = {
            version: window.AppConfig?.APP_CONFIG?.version || "N/A",
            exportTime: new Date().toISOString(),
            progressManagerVersion: "1.1", // Consider updating this if schema changes significantly
            userData: this.userProgress
        };
        return JSON.stringify(exportData, null, 2);
    }

    async importUserData(importDataString) {
        try {
            const importData = JSON.parse(importDataString);
            if (importData && importData.userData && importData.userData.statistics && importData.userData.history) {
                this.userProgress = importData.userData;
                this.ensureProgressDataIntegrity(); // Important to ensure new fields are defaulted if importing old data
                await this.saveUserProgress();
                console.log('User data imported successfully.');
                if (window.uiManager && typeof window.uiManager.refreshUI === 'function') {
                    window.uiManager.refreshUI({ fullReload: true, newProgressData: true });
                }
                return true;
            }
            throw new Error('无效的用户数据格式或缺少关键字段。');
        } catch (error) {
            console.error('导入用户数据失败:', error);
            throw error;
        }
    }



    getLastDailyDate() {
        return (this.userProgress && this.userProgress.statistics) ? this.userProgress.statistics.lastDailyQuizDate : null;
    }

    async setLastDailyDate(dateString) {
        if (this.userProgress && this.userProgress.statistics) {
            this.userProgress.statistics.lastDailyQuizDate = dateString;
            await this.saveUserProgress();
        } else {
            console.warn("Cannot set last daily date: userProgress or statistics object is missing.");
        }
    }

    isInitialized() {
        return this.initialized;
    }

    async recordReviewPracticeCompletion() {
        if (!this.initialized) return;
        this.userProgress.statistics.reviewPracticeCount = (this.userProgress.statistics.reviewPracticeCount || 0) + 1;
        if (this.userProgress.statistics.reviewPracticeCount === 1) {
            this.userProgress.statistics.firstReviewPracticeDone = true;
        }
        await this.saveUserProgress();
        this.checkAchievements();
    }

    getCurrentAchievementValue(achievementId) {
        if (!this.userProgress || !this.userProgress.statistics || !window.AppConfig || !window.AppConfig.ACHIEVEMENT_DEFINITIONS) {
            return 0;
        }
        const stats = this.userProgress.statistics;
        const achDef = window.AppConfig.ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
        if (!achDef) return 0;

        try {
            switch (achDef.type) {
                case 'count':
                    if (achDef.id.startsWith('quiz_attempts_')) return stats.totalQuizzes;
                    if (achDef.id.startsWith('question_answered_')) return stats.totalQuestions;
                    if (achDef.id.startsWith('completed_unique_quizzes_')) return stats.completedQuizIds.length;
                    if (achDef.id === 'perfect_quiz_10_plus') return stats.quizzesWithPerfectScore || 0;
                    if (achDef.id === 'perfect_quiz_hard') return stats.hardQuizzesWithPerfectScore || 0;
                    if (achDef.id === 'no_mistakes_streak_3') return stats.maxNoMistakesStreak || 0;
                    if (achDef.id.startsWith('streak_accuracy_80_')) return stats.maxStreak || 0;
                    if (achDef.id.startsWith('study_days_')) return stats.studyDays;
                    if (achDef.id.startsWith('daily_quiz_streak_')) return stats.dailyQuizConsecutiveDays || 0;
                    if (achDef.id.startsWith('master_incorrect_')) return stats.incorrectQuestionsMasteredCount || 0;
                    if (achDef.id === 'review_guru') return stats.reviewPracticeCount || 0;
                    return 0;

                case 'flag':
                    if (achDef.statKey && stats.hasOwnProperty(achDef.statKey)) {
                        const statValue = stats[achDef.statKey];
                        const targetValue = achDef.target !== undefined ? achDef.target : 1;

                        if (typeof statValue === 'boolean') {
                            return (statValue === targetValue) ? 1 : 0;
                        } else if (typeof statValue === 'number') {
                            return (statValue >= targetValue) ? 1 : (statValue || 0);
                        }
                        return 0;
                    }
                    return 0;

                case 'flag_count_based':
                    if (achDef.statKey === 'incorrectQuestionsClearedCount') {
                        return stats.incorrectQuestionsClearedCount || 0;
                    }
                    return 0;

                case 'percentage':
                    if (achDef.id.startsWith('accuracy_overall_')) return parseFloat((stats.accuracy || 0).toFixed(1));
                    return 0;

                case 'streak_complex':
                    let consecutiveHighAccuracyQuizzes = 0;
                    let maxConsecutiveHigh = 0;
                    for (const quizRecord of this.userProgress.history) {
                        if (quizRecord.accuracy >= 90) {
                            consecutiveHighAccuracyQuizzes++;
                            maxConsecutiveHigh = Math.max(maxConsecutiveHigh, consecutiveHighAccuracyQuizzes);
                        } else consecutiveHighAccuracyQuizzes = 0;
                    }
                    return maxConsecutiveHigh;

                case 'subject_expert':
                    const s = stats.subjectStats?.[achDef.subjectId];
                    return s?.completedQuizIds?.length || 0;

                case 'period_count':
                    return stats.periodStats?.[achDef.periodKey]?.completedQuizIds.length || 0;

                default: return 0;
            }
        } catch (e) {
            console.error(`Error getting current value for achievement ${achievementId}:`, e);
            return 0;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.progressManager = new ProgressManager();
    });
} else {
    window.progressManager = new ProgressManager();
}
// --- END OF FILE progress-manager.js (MODIFIED) ---