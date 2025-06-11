// js/data-manager.js

/**
 * 数据管理模块
 * 负责题库数据的存储、验证、增删改查等操作
 */
class DataManager {
    constructor() {
        this.quizData = null;
        this.initialized = false;

        if (window.AppConfig) {
            this.init().catch(err => console.error("Async init failed in constructor:", err));
        } else {
            setTimeout(() => this.init().catch(err => console.error("Async init failed in constructor (timeout):", err)), 10);
        }
    }

    /**
     * 修复后的初始化数据管理器方法
     */
    async init() {
        try {
            if (!window.AppConfig) {
                console.warn('DataManager: AppConfig not loaded yet, retrying init...');
                await new Promise(resolve => setTimeout(resolve, 50));
                return this.init(); // Recursive call to retry
            }

            if (window.storageManager && !window.storageManager.isInitialized) {
                console.log('DataManager: Waiting for StorageManager to initialize...');
                await window.storageManager.init();
            }

            let savedData = null;
            try {
                savedData = await this.loadData();
                console.log('DataManager: 尝试加载保存的数据:', savedData ? '成功' : '无数据');
            } catch (loadError) {
                console.error('DataManager: 加载数据时出错，但不会重置:', loadError);
            }

            if (savedData && typeof savedData === 'object' && Object.keys(savedData).length > 0) {
                this.quizData = savedData;
                console.log('✅ 使用保存的数据，包含题库:', Object.keys(savedData));
            } else {
                console.warn('⚠️ 没有找到保存的数据，使用默认数据');
                this.quizData = JSON.parse(JSON.stringify(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA));
                this.showDataRecoveryOptions();
            }

            await this.ensureDataIntegrityGentle();

            try {
                await this.saveData();
                console.log('✅ 数据保存成功 (init)');
            } catch (saveError) {
                console.error('❌ 初始化时数据保存失败:', saveError);
            }

            this.initialized = true;
            const storageType = window.storageManager?.isInitialized ? (window.storageManager.fallbackToLocalStorage ? 'localStorage (fallback)' : 'IndexedDB') : 'localStorage (no storageManager or init failed)';
            console.log(`✅ DataManager initialized successfully with ${storageType}`);

        } catch (error) {
            console.error('❌ DataManager initialization failed:', error);
            await this.attemptDataRecovery();
            this.initialized = true;
        }
    }

    /**
     * 显示数据恢复选项
     */
    showDataRecoveryOptions() {
        const normalKey = window.AppConfig.APP_CONFIG.storageKey;
        const prefix = normalKey + '_emergency_';
        let latestEmergencyBackupData = null;

        const emergencyKeys = Object.keys(localStorage)
            .filter(k => k.startsWith(prefix));

        if (emergencyKeys.length > 0) {
            emergencyKeys.sort((a, b) => {
                const tsA = parseInt(a.substring(prefix.length), 10) || 0;
                const tsB = parseInt(b.substring(prefix.length), 10) || 0;
                return tsB - tsA; // Newest first
            });
            const latestEmergencyKey = emergencyKeys[0];
            latestEmergencyBackupData = localStorage.getItem(latestEmergencyKey);
        }

        if (latestEmergencyBackupData) {
            try {
                JSON.parse(latestEmergencyBackupData);
                const userChoice = confirm(
                    '检测到较早的紧急备份数据。您是否希望尝试恢复此备份？\n\n' +
                    '点击"确定"尝试恢复备份数据。\n' +
                    '点击"取消"将继续使用当前数据（如果当前无数据，则为默认题库）。\n\n' +
                    '注意：恢复操作会覆盖当前内存中的任何未保存数据。'
                );

                if (userChoice) {
                    try {
                        this.quizData = JSON.parse(latestEmergencyBackupData);
                        console.log('✅ 从localStorage紧急备份恢复数据成功');
                        this.saveData().then(() => {
                            alert('数据已从紧急备份中恢复并保存。');
                        }).catch(err => {
                            console.error('从紧急备份恢复后保存失败:', err);
                            alert('数据已从紧急备份中恢复到内存，但保存到主存储失败。请尝试手动导出数据。');
                        });
                        return;
                    } catch (parseError) {
                        console.error('❌ 紧急备份数据损坏或解析失败:', parseError);
                        alert('紧急备份数据似乎已损坏，无法恢复。');
                    }
                } else {
                    console.log('用户选择不从紧急备份恢复。');
                }
            } catch (e) {
                console.warn('localStorage中的emergencyKey内容不是有效的JSON，忽略:', e);
            }
        }
    }

    /**
     * 尝试数据恢复
     */
    async attemptDataRecovery() {
        console.log('🔄 尝试恢复数据...');

        let recoveredData = null;
        const normalKey = window.AppConfig.APP_CONFIG.storageKey;
        const prefix = normalKey + '_emergency_';
        const emergencyKeys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        emergencyKeys.sort((a, b) => {
            const tsA = parseInt(a.substring(prefix.length), 10) || 0;
            const tsB = parseInt(b.substring(prefix.length), 10) || 0;
            return tsB - tsA;
        });

        for (const emergencyKey of emergencyKeys) {
            const emergencyData = localStorage.getItem(emergencyKey);
            if (emergencyData) {
                try {
                    const parsedEmergency = JSON.parse(emergencyData);
                    if (this.validateFullDataStructure(parsedEmergency)) {
                        recoveredData = parsedEmergency;
                        console.log(`✅ 从紧急备份 ${emergencyKey} 恢复数据`);
                        break;
                    } else {
                        console.warn(`紧急备份 ${emergencyKey} 数据结构验证失败，尝试下一个。`);
                    }
                } catch (e) {
                    console.warn(`紧急备份 ${emergencyKey} 数据损坏或解析失败`);
                }
            }
        }

        if (!recoveredData) {
            const normalData = localStorage.getItem(normalKey);
            if (normalData) {
                try {
                    const parsedNormalData = JSON.parse(normalData);
                    if (this.validateFullDataStructure(parsedNormalData)) {
                        recoveredData = parsedNormalData;
                        console.log('✅ 从localStorage主存储恢复数据');
                    } else {
                        console.warn('localStorage主存储数据结构验证失败。');
                    }
                } catch (e) {
                    console.warn('localStorage主存储数据损坏或解析失败');
                }
            }
        }

        if (recoveredData && typeof recoveredData === 'object' && Object.keys(recoveredData).length > 0) {
            this.quizData = recoveredData;
            try {
                await this.saveData();
                alert('🎉 数据恢复成功！已找回您之前的数据。');
            } catch (saveError) {
                console.error('恢复数据后保存失败:', saveError);
                alert('数据已从旧存储中恢复到内存，但保存到新存储系统失败。请尝试手动导出数据。');
            }
            return;
        }

        console.warn('⚠️ 数据恢复失败，最终使用默认数据');
        this.quizData = JSON.parse(JSON.stringify(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA || {}));
    }

    /**
     * 创建紧急备份到localStorage, with size check.
     */
    createEmergencyBackup() {
        if (!this.quizData || Object.keys(this.quizData).length === 0) {
            console.warn('不创建 localStorage 紧急备份：quizData为空。');
            return;
        }

        // --- NEW LOGIC: Size Check ---
        let dataString;
        try {
            dataString = JSON.stringify(this.quizData);
        } catch (e) {
            console.error("创建紧急备份时无法序列化quizData:", e);
            return; // Can't proceed if data can't be stringified
        }
        
        // localStorage limit is ~5MB, let's use a safe threshold of 4MB.
        // String length is a good proxy for byte size (UTF-16 encoding means ~2 bytes/char).
        // So, 4MB is roughly 2 million characters.
        const sizeThreshold = 2 * 1024 * 1024; // 2 million chars, approx 4MB
        if (dataString.length > sizeThreshold) {
            // console.log(`DataManager: Skipping localStorage emergency backup because data size (${(dataString.length / (1024*1024)).toFixed(2)}MB) exceeds threshold. Relying on IndexedDB.`);
            return; // Silently skip if data is too large. This is expected behavior.
        }
        // --- END OF NEW LOGIC ---

        try {
            // It clears old backups, which is good.
            this.clearOldEmergencyBackups(0); 
            
            const key = window.AppConfig.APP_CONFIG.storageKey + '_emergency_' + Date.now();
            // The failing line (now protected by the size check):
            localStorage.setItem(key, dataString); // Use the already stringified data
            console.log('✅ 创建 localStorage 紧急备份成功:', key);

        } catch (error) {
            console.error('❌ 创建 localStorage 紧急备份失败:', error.name, error.message);
            if (error.name === 'QuotaExceededError' || (error.message && error.message.toLowerCase().includes('quota'))) {
                console.warn('localStorage空间不足，无法创建紧急备份。主存储为IndexedDB，请优先依赖其备份机制。');
                if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast('localStorage 紧急备份失败：空间已满。', 'warning', 7000);
                }
            }
        }
    }

    clearOldEmergencyBackups(keepCount = 0) {
        try {
            const normalKey = window.AppConfig.APP_CONFIG.storageKey;
            const prefix = normalKey + '_emergency_';
            const emergencyKeys = Object.keys(localStorage)
                .filter(k => k.startsWith(prefix))
                .sort((a, b) => {
                    const tsA = parseInt(a.substring(prefix.length), 10) || 0;
                    const tsB = parseInt(b.substring(prefix.length), 10) || 0;
                    return tsA - tsB; // Sorts oldest first
                });

            if (emergencyKeys.length > keepCount) {
                const keysToDelete = emergencyKeys.slice(0, emergencyKeys.length - keepCount);
                keysToDelete.forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`清理旧的紧急备份: ${key}`);
                });
            }
        } catch(e) {
            console.error("清理旧紧急备份时出错:", e);
        }
    }

    /**
     * 温和的数据完整性检查 - 不会覆盖用户数据
     */
    async ensureDataIntegrityGentle() {
        if (!window.AppConfig?.DEFAULT_INITIAL_QUIZ_DATA) {
            console.warn('DEFAULT_INITIAL_QUIZ_DATA not available, skipping gentle integrity check');
            return;
        }
        if (!this.quizData || typeof this.quizData !== 'object') {
            console.warn('quizData is not an object or is null, initializing as empty object for integrity check.');
            this.quizData = {};
        }

        let dataWasModified = false;
        const defaultStructure = window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA;

        for (const subjectKey in defaultStructure) {
            if (!this.quizData.hasOwnProperty(subjectKey)) {
                this.quizData[subjectKey] = JSON.parse(JSON.stringify(defaultStructure[subjectKey]));
                dataWasModified = true;
            } else {
                const currentSubject = this.quizData[subjectKey];
                const defaultSubject = defaultStructure[subjectKey];

                if (!currentSubject || typeof currentSubject !== 'object') {
                    this.quizData[subjectKey] = JSON.parse(JSON.stringify(defaultSubject));
                    dataWasModified = true;
                    continue;
                }

                ['id', 'name', 'description', 'icon'].forEach(field => {
                    if (!currentSubject.hasOwnProperty(field) || currentSubject[field] === undefined) {
                        currentSubject[field] = defaultSubject[field];
                        dataWasModified = true;
                    }
                });

                if (typeof currentSubject.periods !== 'object' || currentSubject.periods === null) {
                    currentSubject.periods = {};
                    dataWasModified = true;
                }
            }
        }

        if (dataWasModified) {
            console.log("DataManager: 数据完整性检查(Gentle)完成，进行了必要的修复/添加。");
        }
    }

    /**
     * 验证保存是否成功
     */
    async verifySaveSuccess() {
        try {
            const savedData = await this.loadData();
            if (!savedData) {
                console.warn('保存验证警告：无法读取刚保存的数据或数据为空。');
                return;
            }
            console.log('✅ 数据保存验证成功 (基本检查: 数据已加载)');
        } catch (error) {
            console.error('❌ 数据保存验证失败:', error);
            throw error;
        }
    }

    /**
     * 从存储系统加载数据
     */
    async loadData() {
        try {
            if (window.storageManager && !window.storageManager.isInitialized) {
                console.log("DataManager.loadData: StorageManager not initialized, attempting init first.");
                await window.storageManager.init();
            }

            if (window.storageManager && window.storageManager.isInitialized && typeof window.storageManager.getItem === 'function') {
                console.log("DataManager: Loading data from StorageManager...");
                const data = await window.storageManager.getItem('quizData', 'main');

                if (data) {
                    if (typeof data === 'object' && data !== null) {
                        return data;
                    }
                    console.warn("DataManager: Data from StorageManager is not a valid object or is corrupted.", data);
                    return null;
                } else {
                    console.log("DataManager: No data found in StorageManager, attempting localStorage fallback.");
                    const key = window.AppConfig.APP_CONFIG.storageKey;
                    let raw = localStorage.getItem(key);

                    if (!raw) {
                        const prefix = key + '_emergency_';
                        const emergencyKeys = Object.keys(localStorage)
                            .filter(k => k.startsWith(prefix));

                        if (emergencyKeys.length > 0) {
                            emergencyKeys.sort((a, b) => {
                                const tsA = parseInt(a.substring(prefix.length), 10) || 0;
                                const tsB = parseInt(b.substring(prefix.length), 10) || 0;
                                return tsB - tsA;
                            });
                            const latestEmergencyKey = emergencyKeys[0];
                            raw = localStorage.getItem(latestEmergencyKey);
                            if (raw) {
                                console.log(`DataManager: Loaded from emergency localStorage key "${latestEmergencyKey}" (StorageManager was empty).`);
                            }
                        }
                    } else {
                        console.log(`DataManager: Loaded from primary localStorage key "${key}" (StorageManager was empty).`);
                    }

                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            if (typeof parsed === 'object' && parsed !== null) {
                                console.log("DataManager: Successfully loaded data from localStorage fallback.");
                                return parsed;
                            }
                            console.warn("DataManager: Data from localStorage fallback is not a valid object.", parsed);
                        } catch (e) {
                            console.error("DataManager: Error parsing localStorage fallback data:", e);
                        }
                    }
                    console.log("DataManager: No valid data found in localStorage fallback (StorageManager was empty).");
                    return null;
                }
            } else {
                console.warn("DataManager: StorageManager not available/initialized or getItem is not a function. Falling back to localStorage.");
                const key = window.AppConfig.APP_CONFIG.storageKey;
                let raw = localStorage.getItem(key);

                if (!raw) {
                    const prefix = key + '_emergency_';
                    const emergencyKeys = Object.keys(localStorage)
                        .filter(k => k.startsWith(prefix));

                    if (emergencyKeys.length > 0) {
                        emergencyKeys.sort((a, b) => {
                            const tsA = parseInt(a.substring(prefix.length), 10) || 0;
                            const tsB = parseInt(b.substring(prefix.length), 10) || 0;
                            return tsB - tsA;
                        });
                        const latestEmergencyKey = emergencyKeys[0];
                        raw = localStorage.getItem(latestEmergencyKey);
                        if (raw) {
                            console.log(`DataManager: Loaded from emergency localStorage key "${latestEmergencyKey}" (StorageManager not available/initialized).`);
                        }
                    }
                } else {
                    console.log(`DataManager: Loaded from primary localStorage key "${key}" (StorageManager not available/initialized).`);
                }

                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (typeof parsed === 'object' && parsed !== null) {
                            console.log("DataManager: Loaded data from localStorage (StorageManager not available/initialized).");
                            return parsed;
                        }
                        console.warn("DataManager: Data from localStorage (StorageManager not available/initialized) is not a valid object. Corrupted?");
                    } catch (e) {
                        console.error("Error parsing localStorage (StorageManager not available/initialized) data:", e);
                    }
                }
                return null;
            }
        } catch (error) {
            console.error('Load data from StorageManager failed or other load error, attempting localStorage fallback due to error:', error);
            try {
                console.warn("DataManager: Attempting to load from localStorage as a fallback after error during load process.");
                const key = window.AppConfig.APP_CONFIG.storageKey;
                let raw = localStorage.getItem(key);

                if (!raw) {
                    const prefix = key + '_emergency_';
                    const emergencyKeys = Object.keys(localStorage)
                        .filter(k => k.startsWith(prefix));

                    if (emergencyKeys.length > 0) {
                        emergencyKeys.sort((a, b) => {
                            const tsA = parseInt(a.substring(prefix.length), 10) || 0;
                            const tsB = parseInt(b.substring(prefix.length), 10) || 0;
                            return tsB - tsA;
                        });
                        const latestEmergencyKey = emergencyKeys[0];
                        raw = localStorage.getItem(latestEmergencyKey);
                        if (raw) {
                            console.log(`DataManager: Loaded from emergency localStorage key "${latestEmergencyKey}" (after load error).`);
                        }
                    }
                } else {
                    console.log(`DataManager: Loaded from primary localStorage key "${key}" (after load error).`);
                }

                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (typeof parsed === 'object' && parsed !== null) {
                            console.log("DataManager: Loaded data from localStorage (after load error).");
                            return parsed;
                        }
                    } catch (eParse) {
                        console.error('Error parsing localStorage data during error fallback:', eParse);
                    }
                }
            } catch (lsError) {
                console.error('Fallback localStorage load (during error handling) also failed:', lsError);
            }
            return null;
        }
    }

    /**
     * 增强的保存数据方法
     */
    async saveData() {
        if (!this.quizData) {
            console.warn("DataManager: saveData called with no quizData. Aborting save.");
            return;
        }

        this.createEmergencyBackup();

        try {
            if (window.storageManager && !window.storageManager.isInitialized) {
                console.log("DataManager.saveData: StorageManager not initialized, attempting init first.");
                await window.storageManager.init();
            }

            if (window.storageManager && window.storageManager.isInitialized && typeof window.storageManager.setItem === 'function') {
                await window.storageManager.setItem('quizData', 'main', this.quizData);
                console.log('✅ 数据保存到主存储 (e.g., IndexedDB) 成功');

                const now = Date.now();
                const lastBackupTimestamp = localStorage.getItem('lastAutoBackupTimestamp');
                const backupInterval = 24 * 60 * 60 * 1000;

                if (!lastBackupTimestamp || (now - parseInt(lastBackupTimestamp)) > backupInterval) {
                    if (typeof window.storageManager.createBackup === 'function') {
                        try {
                            const backupName = `auto_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
                            await window.storageManager.createBackup(backupName);
                            localStorage.setItem('lastAutoBackupTimestamp', now.toString());
                            console.log(`📦 StorageManager 自动备份已创建: ${backupName}`);
                        } catch (backupError) {
                            console.warn('StorageManager 自动备份创建失败:', backupError);
                        }
                    } else {
                        console.warn('StorageManager.createBackup function not found, skipping auto backup.');
                    }
                }
            } else {
                console.warn("DataManager: StorageManager not available/initialized or setItem is not a function. Saving to primary localStorage key.");
                localStorage.setItem(window.AppConfig.APP_CONFIG.storageKey, JSON.stringify(this.quizData));
                console.log('✅ 数据保存到localStorage (主键) 成功');
            }

            await this.verifySaveSuccess();
        } catch (error) {
            console.error('Save data to primary/fallback storage failed:', error);
            console.warn('DataManager: Primary save failed. An emergency backup was attempted in localStorage.');

            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast('数据保存到主存储失败！但已尝试创建紧急备份。建议尽快导出数据。', 'error', 10000);
            }
            throw error;
        }
    }

    /**
     * 获取完整的题库数据
     */
    getData() {
        return this.quizData;
    }

    /**
     * 获取指定学科的时期选项
     */
    getPeriodOptions(subjectId) {
        return window.AppConfig?.PERIOD_OPTIONS?.[subjectId] || [];
    }

    /**
     * 添加新题库 - 修改为异步
     */
    async addQuiz(subjectId, periodData, newQuizData) {
        const subject = this.quizData[subjectId];
        if (!subject) {
            console.error(`Subject with ID "${subjectId}" does not exist. Cannot add quiz.`);
            throw new Error('所选学科不存在');
        }

        if (!subject.periods) {
            subject.periods = {};
        }

        if (!subject.periods[periodData.id]) {
            subject.periods[periodData.id] = {
                id: periodData.id,
                name: periodData.name,
                description: periodData.description,
                icon: this.getRandomIcon(),
                quizzes: []
            };
        }

        if (!newQuizData.id) {
            newQuizData.id = this.generateQuizId(newQuizData.name);
        }

        subject.periods[periodData.id].quizzes.push(newQuizData);
        try {
            await this.saveData();
        } catch (err) {
            console.error('题库持久化失败：', err);
        }
    }

    /**
     * 删除题库 - 修改为异步
     */
    async deleteQuiz(subjectId, periodId, quizId) {
        const period = this.quizData[subjectId]?.periods[periodId];
        if (!period || !period.quizzes) return false;

        const initialLength = period.quizzes.length;
        period.quizzes = period.quizzes.filter(quiz => quiz.id !== quizId);

        const wasDeleted = period.quizzes.length < initialLength;
        if (wasDeleted) {
            await this.saveData();
        }
        return wasDeleted;
    }

    /**
     * 获取指定题库
     */
    getQuiz(subjectId, periodId, quizId) {
        return this.quizData[subjectId]?.periods[periodId]?.quizzes.find(q => q.id === quizId);
    }

    /**
     * 验证题库数据结构
     */
    validateQuizData(data) {
        try {
            if (!data || typeof data !== 'object') return false;

            if (data.id && data.name && Array.isArray(data.questions)) {
                return this.validateSingleQuizObject(data);
            }

            if (Array.isArray(data.quizzes)) {
                return data.quizzes.every(quiz => this.validateSingleQuizObject(quiz, true));
            }

            if (Array.isArray(data) && data.length > 0 && data.every(q => this.validateQuestion(q))) {
                return true;
            }

            if (Object.values(data).some(subject => subject && subject.id && subject.periods)) {
                return this.validateFullDataStructure(data);
            }

            console.warn("Unrecognized data structure for validation:", data);
            return false;
        } catch (error) {
            console.error('Data validation error:', error, "Data:", data);
            return false;
        }
    }

    /**
     * 验证单个题库对象 (can be called for manual add or individual quiz from AI import)
     */
    validateSingleQuizObject(quiz, isImportContext = false) {
        if (!quiz || typeof quiz !== 'object') {
            console.error("Invalid quiz object: not an object or null", quiz);
            return false;
        }
        const hasBaseFields = quiz.name && Array.isArray(quiz.questions);
        const hasImportFields = isImportContext ? (quiz.subject || quiz.subjectId) && (quiz.period || quiz.periodId) : true;

        if (!hasBaseFields || !hasImportFields) {
            console.error("Invalid quiz object: Missing essential fields.", "Quiz:", quiz, "IsImport:", isImportContext);
            return false;
        }

        if (quiz.questions.length === 0 && isImportContext) {
            console.warn("Validation warning: Imported quiz has no questions.", quiz.name);
        }
        return quiz.questions.every(question => this.validateQuestion(question));
    }

    /**
     * 验证题目结构
     */
    validateQuestion(question) {
        if (!question || typeof question !== 'object') {
            console.warn("Invalid question object: null or not an object", question);
            return false;
        }

        const hasBasicFields = question.question &&
            Array.isArray(question.options) &&
            question.options.length >= 2;

        if (!hasBasicFields) {
            console.warn("Invalid question: Missing question text or insufficient options.", question);
            return false;
        }

        const isSingleChoice = typeof question.correctAnswer === 'number' &&
            question.correctAnswer >= 0 &&
            question.correctAnswer < question.options.length;

        const isMultipleChoice = Array.isArray(question.correctAnswers) &&
            question.correctAnswers.length >= 1 &&
            question.correctAnswers.every(i =>
                Number.isInteger(i) && i >= 0 && i < question.options.length
            ) &&
            new Set(question.correctAnswers).size === question.correctAnswers.length;

        const isValidAnswerSpec = isSingleChoice || isMultipleChoice;

        if (!isValidAnswerSpec) {
            console.warn(`Invalid question: Incorrect answer specification.`, question,
                `isSingle: ${isSingleChoice}, isMulti: ${isMultipleChoice}`);
            if (isMultipleChoice && question.correctAnswers.length < 1) {
                console.warn("Multiple choice question must have at least 1 correct answer.");
            }
            return false;
        }

        const isValidExplanation = typeof question.explanation === 'string' ||
            question.explanation === null ||
            typeof question.explanation === 'undefined';

        if (!isValidExplanation) {
            console.warn("Invalid question: Explanation format is incorrect.", question);
            return false;
        }
        return true;
    }

    /**
     * 验证完整数据结构 (for localStorage/backup restore)
     */
    validateFullDataStructure(fullData) {
        if (!fullData || typeof fullData !== 'object' || Object.keys(fullData).length === 0) {
            console.warn("Full data validation: Data is null, not an object, or empty.", fullData);
            return false;
        }
        for (const subjectKey of Object.keys(fullData)) {
            const subject = fullData[subjectKey];
            if (!subject || typeof subject !== 'object' || !subject.id || !subject.name) {
                console.error("Invalid subject structure in full data:", subjectKey, subject);
                return false;
            }
            if (subject.hasOwnProperty('periods') && (typeof subject.periods !== 'object' || subject.periods === null)) {
                console.error("Invalid periods structure for subject:", subjectKey, subject.periods);
                return false;
            }

            if (subject.periods) {
                for (const periodKey of Object.keys(subject.periods)) {
                    const period = subject.periods[periodKey];
                    if (!period || typeof period !== 'object' || !period.id || !period.name || !Array.isArray(period.quizzes)) {
                        console.error("Invalid period structure in full data:", periodKey, period, "Subject:", subject.name);
                        return false;
                    }
                    for (const quiz of period.quizzes) {
                        if (!quiz.id || !this.validateSingleQuizObject(quiz, false)) {
                            console.error("Invalid quiz structure within period in full data:", quiz, "Period:", period.name);
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * 获取数据统计信息
     */
    getDataStatistics(data = null) {
        const sourceData = data || this.quizData;
        let subjects = 0;
        let periods = 0;
        let quizzes = 0;
        let questions = 0;

        if (!sourceData || typeof sourceData !== 'object') {
            return { subjects, periods, quizzes, questions, storage: {} };
        }

        for (const subject of Object.values(sourceData)) {
            if (subject && subject.id) subjects++;
            if (subject && subject.periods && typeof subject.periods === 'object') {
                for (const period of Object.values(subject.periods)) {
                    if (period && period.id) periods++;
                    if (period && period.quizzes && Array.isArray(period.quizzes)) {
                        for (const quiz of period.quizzes) {
                            if (quiz && quiz.id) quizzes++;
                            if (quiz && quiz.questions && Array.isArray(quiz.questions)) {
                                questions += quiz.questions.length;
                            }
                        }
                    }
                }
            }
        }
        return { subjects, periods, quizzes, questions };
    }

    /**
     * 恢复数据 - 修改为异步
     */
    async restoreData(newData) {
        if (!this.validateFullDataStructure(newData)) {
            throw new Error('恢复的数据格式验证失败。请确保是包含学科、时期和题库的完整结构。');
        }
        this.quizData = JSON.parse(JSON.stringify(newData));
        await this.ensureDataIntegrityGentle();
        await this.saveData();
        console.log("✅ 数据恢复并保存成功。");
    }

    /**
     * 获取备份数据
     */
    getBackupData() {
        const now = new Date();
        return {
            version: window.AppConfig.APP_CONFIG.version,
            exportTime: now.toISOString(),
            statistics: this.getDataStatistics(),
            data: this.quizData
        };
    }

    /**
     * 确保数据结构完整性 - (Original, kept for reference, but ensureDataIntegrityGentle is preferred for init)
     */
    async ensureDataIntegrity() {
        if (!window.AppConfig?.DEFAULT_INITIAL_QUIZ_DATA || !this.quizData) {
            console.warn('DEFAULT_INITIAL_QUIZ_DATA or quizData not available, skipping integrity check');
            return;
        }

        let dataWasModified = false;
        const defaultStructure = JSON.parse(JSON.stringify(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA));

        for (const subjectKey in defaultStructure) {
            if (!this.quizData.hasOwnProperty(subjectKey) ||
                typeof this.quizData[subjectKey] !== 'object' ||
                this.quizData[subjectKey] === null) {

                this.quizData[subjectKey] = JSON.parse(JSON.stringify(defaultStructure[subjectKey]));
                dataWasModified = true;
            } else {
                const currentSubject = this.quizData[subjectKey];
                const defaultSubject = defaultStructure[subjectKey];

                ['id', 'name', 'description', 'icon'].forEach(field => {
                    if (!currentSubject.hasOwnProperty(field) || currentSubject[field] === undefined) {
                        currentSubject[field] = defaultSubject[field];
                        dataWasModified = true;
                    }
                });

                if (typeof currentSubject.periods !== 'object' || currentSubject.periods === null) {
                    currentSubject.periods = JSON.parse(JSON.stringify(defaultSubject.periods)) || {};
                    dataWasModified = true;
                } else {
                    const subjectDefaultPeriodsOptions = window.AppConfig.PERIOD_OPTIONS[subjectKey] || [];
                    const defaultSubjectPeriodsData = defaultStructure[subjectKey].periods || {};

                    subjectDefaultPeriodsOptions.forEach(defaultPeriodOption => {
                        const periodId = defaultPeriodOption.id;
                        if (!currentSubject.periods[periodId]) {
                            const periodTemplate = defaultSubjectPeriodsData[periodId] || {
                                id: defaultPeriodOption.id,
                                name: defaultPeriodOption.name,
                                description: defaultPeriodOption.description,
                                icon: this.getRandomIcon(),
                                quizzes: []
                            };
                            currentSubject.periods[periodId] = JSON.parse(JSON.stringify(periodTemplate));
                            dataWasModified = true;
                        } else {
                            const currentPeriod = currentSubject.periods[periodId];
                            const defaultPeriodData = defaultSubjectPeriodsData[periodId] || defaultPeriodOption;
                            ['id', 'name', 'description', 'icon'].forEach(field => {
                                if (!currentPeriod.hasOwnProperty(field) || currentPeriod[field] === undefined) {
                                    currentPeriod[field] = defaultPeriodData[field] || (field === 'icon' ? this.getRandomIcon() : '');
                                    dataWasModified = true;
                                }
                            });
                            if (!Array.isArray(currentPeriod.quizzes)) {
                                currentPeriod.quizzes = [];
                                dataWasModified = true;
                            }
                        }
                    });
                }
            }
        }

        if (dataWasModified) {
            console.log("DataManager: QuizData was modified during integrity check. Saving...");
            await this.saveData();
        }
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStatistics() {
        const baseStats = this.getDataStatistics();
        let storageInfoDetails = {
            type: 'localStorage (no storageManager)',
            health: 'unknown',
            warnings: [],
            quota: { usage: 'N/A', limit: 'N/A' },
            stores: {}
        };

        try {
            if (window.storageManager &&
                typeof window.storageManager.getStorageInfo === 'function' &&
                typeof window.storageManager.checkStorageHealth === 'function') {

                const info = await window.storageManager.getStorageInfo();
                const health = await window.storageManager.checkStorageHealth();

                storageInfoDetails = {
                    type: info.type || (window.storageManager.fallbackToLocalStorage ? 'localStorage (fallback)' : 'IndexedDB'),
                    health: health.status || 'unknown',
                    warnings: health.warnings || [],
                    quota: info.quota || { usage: 'N/A', limit: 'N/A' },
                    stores: info.stores || {}
                };
            } else if (window.localStorage) {
                storageInfoDetails.type = 'localStorage (fallback or primary)';
                try {
                    const allLocalStorageData = Object.entries(localStorage).reduce((acc, [key, value]) => acc + key.length + value.length, 0) * 2;
                    storageInfoDetails.quota = { usage: `${(allLocalStorageData / 1024).toFixed(2)} KB`, limit: 'Approx. 5-10MB' };
                } catch (e) { /* ignore */ }
            }
        } catch (error) {
            console.error('获取存储详细信息失败:', error);
            storageInfoDetails.health = 'error fetching details';
            storageInfoDetails.warnings.push(`Error: ${error.message}`);
        }

        return {
            ...baseStats,
            storage: storageInfoDetails
        };
    }

    /**
     * 获取官方定义的题库统计信息（基于DEFAULT_INITIAL_QUIZ_DATA的科目）
     */
    getOfficialDataStatistics() {
        const officialDataStructure = {};
        const defaultSubjects = window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA;

        if (!defaultSubjects || !this.quizData) {
            return { subjects: 0, periods: 0, quizzes: 0, questions: 0 };
        }

        // 只统计在DEFAULT_INITIAL_QUIZ_DATA中定义的科目的数据
        for (const subjectId in defaultSubjects) {
            if (this.quizData[subjectId]) {
                officialDataStructure[subjectId] = this.quizData[subjectId];
            }
        }
        
        // 使用现有方法，但传入过滤后的数据
        return this.getDataStatistics(officialDataStructure);
    }

    /**
     * 获取所有官方题库ID的集合
     */
    getOfficialQuizIdsSet() {
        const officialIds = new Set();
        const defaultSubjects = window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA;

        if (!defaultSubjects || !this.quizData) {
            return officialIds;
        }

        for (const subjectId in defaultSubjects) {
            if (this.quizData[subjectId] && this.quizData[subjectId].periods) {
                for (const periodId in this.quizData[subjectId].periods) {
                    const period = this.quizData[subjectId].periods[periodId];
                    if (period.quizzes) {
                        period.quizzes.forEach(quiz => officialIds.add(quiz.id));
                    }
                }
            }
        }
        return officialIds;
    }

    /**
     * 生成随机图标
     */
    getRandomIcon() {
        const defaultIcons = ['🎭', '🖼️', '🏛️', '🌸', '🏺', '📜', '🎪', '🎨', '🖌️', '📝', '✨', '💡', '⭐', '🔥', '🌟'];
        const iconsToUse = (window.AppConfig?.APP_CONFIG?.ui?.icons?.subjects && window.AppConfig.APP_CONFIG.ui.icons.subjects.length > 0) ?
            [...window.AppConfig.APP_CONFIG.ui.icons.subjects, ...(window.AppConfig.APP_CONFIG.ui.icons.random || [])] :
            defaultIcons;
        return iconsToUse[Math.floor(Math.random() * iconsToUse.length)];
    }

    /**
     * 生成唯一ID (for quizzes, periods if custom)
     * MODIFIED: Use Utils.generateId
     */
    generateQuizId(name) {
        const uniquePart = Utils.generateId();
        const cleanName = name.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\wа-яА-ЯёЁ\u4e00-\u9fff0-9-]/g, '')
            .substring(0, 30);
        return `${cleanName}_${uniquePart}`;
    }

    /**
     * 获取指定学科的随机题目
     */
    getRandomQuestions(subjectId, n) {
        const pool = [];
        const subject = this.quizData[subjectId];

        if (!subject || !subject.periods) {
            console.warn(`Subject ${subjectId} not found or has no periods for getRandomQuestions.`);
            return [];
        }

        Object.values(subject.periods).forEach(period => {
            if (period.quizzes && Array.isArray(period.quizzes)) {
                period.quizzes.forEach(quiz => {
                    if (quiz.questions && Array.isArray(quiz.questions)) {
                        quiz.questions.forEach(question => {
                            pool.push({
                                ...question,
                                quizName: quiz.name,
                                section: question.section || '综合',
                                originalSubjectId: subjectId
                            });
                        });
                    }
                });
            }
        });

        if (pool.length === 0) {
            console.warn(`No questions found in subject ${subjectId}.`);
            return [];
        }

        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, n);
    }

    getRandomQuestionsFromSubject(subjectId, count) {
        const subject = this.quizData[subjectId];
        if (!subject || !subject.periods) {
            console.warn(`[DataManager] Subject ${subjectId} not found or has no periods for AI Duel.`);
            return [];
        }

        const allQuestionsInSubject = [];
        Object.values(subject.periods).forEach(period => {
            (period.quizzes || []).forEach(quiz => {
                (quiz.questions || []).forEach(question => {
                    if (question.question && Array.isArray(question.options) &&
                        (question.correctAnswer !== undefined || Array.isArray(question.correctAnswers))) {
                        allQuestionsInSubject.push({
                            ...question,
                        });
                    } else {
                        console.warn(`[DataManager] Skipping invalid question structure in quiz "${quiz.name}" for AI Duel:`, question);
                    }
                });
            });
        });

        if (allQuestionsInSubject.length === 0) {
            console.warn(`[DataManager] No valid questions found in subject ${subjectId} for AI Duel.`);
            return [];
        }

        for (let i = allQuestionsInSubject.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestionsInSubject[i], allQuestionsInSubject[j]] = [allQuestionsInSubject[j], allQuestionsInSubject[i]];
        }
        return allQuestionsInSubject.slice(0, count);
    }

    /**
     * 检查是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * 更新题目数据
     */
    async updateQuestion(subjectId, periodId, quizId, questionIndex, updatedQuestionData) {
        if (!this.quizData || !this.quizData[subjectId] ||
            !this.quizData[subjectId].periods || !this.quizData[subjectId].periods[periodId]) {
            console.error("UpdateQuestion: Subject or Period not found.");
            throw new Error("学科或时期分类未找到。");
        }

        const quiz = this.quizData[subjectId].periods[periodId].quizzes.find(q => q.id === quizId);
        if (!quiz) {
            console.error("UpdateQuestion: Quiz not found.");
            throw new Error("题库未找到。");
        }

        if (!quiz.questions || questionIndex < 0 || questionIndex >= quiz.questions.length) {
            console.error("UpdateQuestion: Question index out of bounds or questions array missing.");
            throw new Error("题目索引无效。");
        }

        if (!updatedQuestionData.question || !Array.isArray(updatedQuestionData.options) ||
            (updatedQuestionData.correctAnswer === undefined && updatedQuestionData.correctAnswers === undefined) ||
            updatedQuestionData.explanation === undefined) {
            console.error("UpdateQuestion: Invalid updated question data structure.", updatedQuestionData);
            throw new Error("提供的题目数据结构不完整。");
        }

        const originalSection = quiz.questions[questionIndex].section;
        quiz.questions[questionIndex] = {
            ...updatedQuestionData,
            section: originalSection
        };

        try {
            await this.saveData();
            console.log(`DataManager: Question at index ${questionIndex} in quiz ${quizId} updated successfully.`);
            return true;
        } catch (error) {
            console.error(`DataManager: Failed to save after updating question ${quizId}[${questionIndex}]`, error);
            throw error;
        }
    }
}

// 创建实例
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dataManager = new DataManager();
    });
} else {
    window.dataManager = new DataManager();
}