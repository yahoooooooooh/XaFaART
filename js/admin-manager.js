/**
 * 学习助手应用 - 管理面板模块
 * 负责题库的管理、AI导入、数据备份、存储管理等功能
 */

class AdminManager {
    constructor() {
        this.subjectNameMap = this.buildSubjectNameMap();
        this.selectedFile = null;
        
        this.initElements();
        // this.setupEventListeners(); // ⚠️ 暂时注释掉，setupEventListeners现在依赖于新的UI元素，先初始化UI再绑定
    }

    /**
     * 在App启动后，UI元素准备好后调用此方法来完成事件绑定
     */
    init() {
        this.setupEventListeners();
        // Initial population for the first AI prompt row's period options (will be handled by setupEventListeners -> addPromptRow)
        // 确保首次加载时至少有一行AI Prompt Builder
        this.addPromptRow(); 
    }

    /**
     * 构建学科名称映射表
     */
    buildSubjectNameMap() {
        const map = {};
        if (window.AppConfig && window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA) {
            Object.keys(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA).forEach(id => {
                map[window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA[id].name] = id;
            });
        }
        return map;
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        // 管理面板主要元素 (现在它是一个sidebar-section)
        // this.adminToggle = document.getElementById('adminToggle'); // ⚠️ REMOVED
        this.adminPanelSection = document.getElementById('adminPanelSection'); // NEW ID

        // 传统表单元素 (注释掉)
        // this.subjectSelect = document.getElementById('subjectSelect');
        // this.periodSelect = document.getElementById('periodSelect');
        // this.customPeriodInput = document.getElementById('customPeriodInput');
        // this.quizNameInput = document.getElementById('quizNameInput');
        // this.quizDescInput = document.getElementById('quizDescInput');
        // this.difficultySelect = document.getElementById('difficultySelect'); // For manual add form
        // this.estimatedTimeInput = document.getElementById('estimatedTimeInput'); // For manual add form
        // this.quizDataInput = document.getElementById('quizDataInput');
        // this.copyInstructionBtn = document.getElementById('copyInstructionBtn');
        
        // 备份功能元素
        this.backupDataBtn = document.getElementById('backupDataBtn');
        this.restoreDataBtn = document.getElementById('restoreDataBtn');
        this.restoreFileInput = document.getElementById('restoreFileInput');
        this.quizListContent = document.getElementById('quizListContent');
        this.adminBackupListContainer = document.getElementById('adminBackupListContainer'); // MODIFIED: Added for backup list

        // AI助手元素 (Global settings for AI Prompt)
        this.aiDifficultySelect = document.getElementById('aiDifficultySelect'); // Global AI difficulty
        this.aiEstimatedTimeSelect = document.getElementById('aiEstimatedTimeSelect'); // Global AI time
        this.aiHasReference = document.getElementById('aiHasReference'); // Global AI reference
        
        this.generatePromptBtn = document.getElementById('generatePromptBtn');
        this.uploadAIResultBtn = document.getElementById('uploadAIResultBtn');

        // 模态框元素
        this.aiUploadModal = document.getElementById('aiUploadModal');
        this.closeAIModal = document.getElementById('closeAIModal');
        this.pasteDataTab = this.aiUploadModal.querySelector('.tab-btn[data-method="paste"]');
        this.uploadFileTab = this.aiUploadModal.querySelector('.tab-btn[data-method="upload"]');
        this.pasteMethodDiv = document.getElementById('pasteMethod');
        this.uploadMethodDiv = document.getElementById('uploadMethod');
        this.aiJsonInput = document.getElementById('aiJsonInput');
        this.aiFileInput = document.getElementById('aiFileInput');
        this.fileDropZone = document.getElementById('fileDropZone');
        this.fileInfoDisplay = document.getElementById('fileInfo');
        this.fileNameDisplay = document.getElementById('fileName');
        this.fileSizeDisplay = document.getElementById('fileSize');
        this.importSubjectSelect = document.getElementById('importSubjectSelect');
        this.conflictResolutionSelect = document.getElementById('conflictResolution');
        this.cancelImportBtn = document.getElementById('cancelImportBtn');
        this.processImportBtn = document.getElementById('processImportBtn');

        // ✅ New elements for multi-row AI prompt
        this.multiPromptRows = document.getElementById('multiPromptRows'); // Container for rows
        this.addPromptRowBtn = document.getElementById('addPromptRow');   // The "Add Row" button

        // 新增：存储管理相关元素
        this.storageStatusInfo = document.getElementById('storageStatusInfo');
        this.checkStorageBtn = document.getElementById('checkStorageBtn');
        this.cleanupStorageBtn = document.getElementById('cleanupStorageBtn');
        this.exportAllDataBtn = document.getElementById('exportAllDataBtn');
        
        // 检查所有重要元素是否已初始化
        if (!this.adminPanelSection || !this.backupDataBtn || !this.restoreDataBtn || !this.quizListContent || !this.aiDifficultySelect || !this.generatePromptBtn || !this.uploadAIResultBtn || !this.multiPromptRows || !this.addPromptRowBtn || !this.storageStatusInfo || !this.checkStorageBtn) {
            console.error("AdminManager: One or more critical DOM elements not found. Initialization aborted. This might be due to HTML structure changes or incorrect IDs.");
            // 可以选择抛出错误或设置一个标志，以防止后续操作
            this.initialized = false;
        } else {
            this.initialized = true;
            console.log("AdminManager: All critical DOM elements found. `this.initialized` set to true.");
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (!this.initialized) {
            console.warn("AdminManager: setupEventListeners skipped because not all elements were initialized.");
            return;
        }
        console.log("AdminManager: Starting setupEventListeners...");
        
        // 管理面板切换 (现在由ui-manager控制，这里不再需要adminToggle)
        // this.adminToggle.addEventListener('click', () => this.togglePanel());

        // 点击外部关闭面板 (现在由ui-manager的左侧面板点击外部逻辑控制)
        // document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // 表单相关事件 (注释掉)
        // if (this.subjectSelect) this.subjectSelect.addEventListener('change', () => this.updatePeriodOptions()); // For manual add form
        // if (this.addQuizForm) this.addQuizForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // 按钮事件 (注释掉 copyInstructionBtn)
        // if (this.copyInstructionBtn) this.copyInstructionBtn.addEventListener('click', () => this.copyInstructionTemplate());
        this.backupDataBtn.addEventListener('click', () => this.backupData());
        this.restoreDataBtn.addEventListener('click', () => this.restoreFileInput.click());
        this.restoreFileInput.addEventListener('change', (e) => this.restoreData(e));

        // AI相关事件
        this.generatePromptBtn.addEventListener('click', () => this.generateSmartPrompt());
        if (this.uploadAIResultBtn) {
            console.log("AdminManager: `uploadAIResultBtn` element found, attempting to bind event.");
            this.uploadAIResultBtn.addEventListener('click', () => {
                console.log("AdminManager: `uploadAIResultBtn` clicked! Calling showUploadModal(true).");
                this.showUploadModal(true);
            });
            console.log("AdminManager: Event listener for `uploadAIResultBtn` ADDED.");
        } else {
            console.error("AdminManager: `uploadAIResultBtn` element is NULL. Event listener NOT added.");
        }
        this.closeAIModal.addEventListener('click', () => this.showUploadModal(false));
        this.cancelImportBtn.addEventListener('click', () => this.showUploadModal(false));
        this.processImportBtn.addEventListener('click', () => this.processAIDataImport());

        // 模态框标签切换
        this.pasteDataTab.addEventListener('click', () => this.switchTab('paste'));
        this.uploadFileTab.addEventListener('click', () => this.switchTab('upload'));

        // 文件上传相关
        this.fileDropZone.addEventListener('click', () => this.aiFileInput.click());
        this.aiFileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // 拖拽上传
        this.setupDragAndDrop();

        // 键盘事件 (现在由app.js中的全局监听处理，admin-manager只处理modal的escape)
        // document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // ✅ New listeners for multi-row AI prompt
        if (this.addPromptRowBtn) { // Ensure button exists
            this.addPromptRowBtn.addEventListener('click', () => this.addPromptRow());
        }
        // this.addPromptRow(); // ⚠️ REMOVED: Moved to init() to ensure it runs after all elements are available

        // 新增：存储管理事件监听器
        if (this.checkStorageBtn) {
            this.checkStorageBtn.addEventListener('click', () => this.checkStorageStatus());
        }
        if (this.cleanupStorageBtn) {
            this.cleanupStorageBtn.addEventListener('click', () => this.cleanupStorage());
        }
        if (this.exportAllDataBtn) {
            this.exportAllDataBtn.addEventListener('click', () => this.exportAllData());
        }
    }

    /**
     * 刷新管理面板内容 (由ui-manager调用)
     */
    refreshPanelContent() {
        this.updateQuizList();
        // this.updatePeriodOptions(); // Commented out: for manual add form
        this.checkStorageStatus(); 
        this.displayBackupList();
    }


    /**
     * 处理外部点击事件 (现在由ui-manager的左侧面板点击外部逻辑控制)
     */
    /*
    handleOutsideClick(e) {
        if (this.adminPanel && this.adminPanel.classList.contains('active') && 
            !this.adminPanel.contains(e.target) && 
            e.target !== this.adminToggle &&
            (!this.aiUploadModal || this.aiUploadModal.style.display !== 'flex' || !this.aiUploadModal.contains(e.target))) {
            this.adminPanel.classList.remove('active');
        }
    }
    */

    /**
     * 处理键盘事件 (Modal内部的Escape由自身处理，全局Escape由app.js处理)
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.aiUploadModal && this.aiUploadModal.style.display === 'flex') {
                this.showUploadModal(false);
            }
            // else if (this.adminPanel && this.adminPanel.classList.contains('active')) {
            //     this.togglePanel(); // No longer directly toggling adminPanel, ui-manager handles leftSidebar
            // }
        }
    }

    /**
     * 设置拖拽上传功能
     */
    setupDragAndDrop() {
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // 防止默认行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            if (this.fileDropZone) { // Ensure element exists
                this.fileDropZone.addEventListener(eventName, preventDefaults, false);
            }
            // document.body.addEventListener(eventName, preventDefaults, false); // Global prevent for all drag-drop
        });

        // 高亮效果
        ['dragenter', 'dragover'].forEach(eventName => {
            if (this.fileDropZone) {
                this.fileDropZone.addEventListener(eventName, () => this.fileDropZone.classList.add('dragover'), false);
            }
        });

        ['dragleave', 'drop'].forEach(eventName => {
            if (this.fileDropZone) {
                this.fileDropZone.addEventListener(eventName, () => this.fileDropZone.classList.remove('dragover'), false);
            }
        });

        // 处理文件拖放
        if (this.fileDropZone) {
            this.fileDropZone.addEventListener('drop', (e) => this.handleFileDrop(e), false);
        }
    }

    /**
     * 切换管理面板 (这个方法现在由ui-manager调用，并且只负责刷新内容)
     */
    /*
    togglePanel() { // This method is now implicitly managed by ui-manager
        // this.adminPanel.classList.toggle('active');
        // if (this.adminPanel.classList.contains('active')) {
            this.updateQuizList();
            // this.updatePeriodOptions(); // Commented out: for manual add form
            this.checkStorageStatus(); 
            this.displayBackupList(); // MODIFIED: Added to display backup list
        // } else {
            // this.resetCustomPeriodInput(); // Commented out: for manual add form
        // }
    }
    */

    /**
     * 重置自定义时期输入 (注释掉)
     */
    /*
    resetCustomPeriodInput() {
        if (this.customPeriodInput) {
            this.customPeriodInput.style.display = 'none';
            this.customPeriodInput.required = false;
        }
    }
    */

    /**
     * 更新手动添加表单的时期选项 (注释掉)
     */
    /*
    updatePeriodOptions() { 
        if (!this.subjectSelect || !this.periodSelect || !this.customPeriodInput) return; // Guard against missing elements

        const subjectId = this.subjectSelect.value;
        this.periodSelect.innerHTML = '<option value="">请选择分类</option>';

        if (subjectId && window.dataManager) {
            const options = window.dataManager.getPeriodOptions(subjectId);
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.name;
                this.periodSelect.appendChild(optionElement);
            });

            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = '自定义分类...';
            this.periodSelect.appendChild(customOption);
        } else {
            this.resetCustomPeriodInput();
            this.customPeriodInput.value = '';
        }

        this.periodSelect.onchange = () => this.handlePeriodSelectChange();
        
        if (this.periodSelect.value === 'custom') {
            this.showCustomPeriodInput();
        } else {
            this.hideCustomPeriodInput();
        }
    }
    */

    /**
     * 处理手动添加表单的时期选择变化 (注释掉)
     */
    /*
    handlePeriodSelectChange() {
        if (this.periodSelect.value === 'custom') {
            this.showCustomPeriodInput();
        } else {
            this.hideCustomPeriodInput();
        }
    }
    */

    /**
     * 显示自定义时期输入 (注释掉)
     */
    /*
    showCustomPeriodInput() {
        if (this.customPeriodInput) {
            this.customPeriodInput.style.display = 'block';
            this.customPeriodInput.required = true;
            this.customPeriodInput.focus();
        }
    }
    */

    /**
     * 隐藏自定义时期输入 (注释掉)
     */
    /*
    hideCustomPeriodInput() {
         if (this.customPeriodInput) {
            this.customPeriodInput.style.display = 'none';
            this.customPeriodInput.required = false;
            this.customPeriodInput.value = '';
        }
    }
    */

    /**
     * 处理表单提交 (注释掉)
     */
    /*
    async handleFormSubmit(e) { // Marked async
        e.preventDefault();
        await this.addNewQuiz(); // Await here
    }
    */

    /**
     * 添加新题库 (注释掉)
     */
    /*
    async addNewQuiz() { // Marked async
        try {
            const formData = this.collectFormData();
            this.validateFormData(formData);
            
            const { periodPayload, newQuiz } = this.prepareQuizData(formData);
            
            await window.dataManager.addQuiz(formData.subjectId, periodPayload, newQuiz); // 改为异步
            
            this.resetForm();
            this.updateQuizList();
            if (window.uiManager) window.uiManager.refreshCurrentPage();
            
            alert('题库添加成功！');
            await this.checkStorageStatus(); // 添加后检查存储状态

        } catch (error) {
            console.error("Error adding quiz:", error);
            alert('添加题库失败：' + error.message);
        }
    }
    */

    /**
     * 收集表单数据 (注释掉)
     */
    /*
    collectFormData() {
        return {
            subjectId: this.subjectSelect.value,
            periodIdValue: this.periodSelect.value,
            customPeriodName: this.customPeriodInput.value.trim(),
            quizName: this.quizNameInput.value.trim(),
            quizDesc: this.quizDescInput.value.trim(),
            difficulty: this.difficultySelect.value, 
            estimatedTime: this.estimatedTimeInput.value.trim(), 
            questionsDataText: this.quizDataInput.value.trim()
        };
    }
    */

    /**
     * 验证表单数据 (注释掉)
     */
    /*
    validateFormData(formData) {
        if (!formData.subjectId) throw new Error('请选择学科！');
        if (formData.periodIdValue === 'custom' && !formData.customPeriodName) throw new Error('请输入自定义分类名称！');
        if (!formData.periodIdValue && formData.periodIdValue !== 'custom') throw new Error('请选择或输入时期分类！');
        if (!formData.quizName) throw new Error('请输入题库名称！');
        if (!formData.questionsDataText) throw new Error('请输入题目数据！');

        let questions;
        try {
            questions = JSON.parse(formData.questionsDataText);
            if (!Array.isArray(questions)) throw new Error("题目数据必须是JSON数组格式。");
            
            const tempQuizForValidation = { id: 'temp', name: formData.quizName, questions: questions };
            if (!window.dataManager.validateQuizData(tempQuizForValidation)) {
                throw new Error('题目数据结构不完整或校验失败，请检查控制台获取详情。');
            }
            if (questions.length === 0) throw new Error('题目数据为空。');
        } catch (error) {
            throw new Error('题目数据格式错误或内容不完整：\n' + error.message);
        }
        formData.questions = questions;
    }
    */

    /**
     * 准备题库数据 (注释掉)
     */
    /*
    prepareQuizData(formData) {
        let finalPeriodId, finalPeriodName, finalPeriodDescription;

        if (formData.periodIdValue === 'custom') {
            finalPeriodName = formData.customPeriodName;
            finalPeriodId = window.dataManager.generateQuizId(finalPeriodName);
            finalPeriodDescription = `${finalPeriodName}相关的知识与题库`;
        } else {
            const selectedPeriodOption = window.dataManager.getPeriodOptions(formData.subjectId)
                .find(p => p.id === formData.periodIdValue);
            if (!selectedPeriodOption) throw new Error("选择的时期分类无效。");
            
            finalPeriodId = selectedPeriodOption.id;
            finalPeriodName = selectedPeriodOption.name;
            finalPeriodDescription = selectedPeriodOption.description;
        }

        const periodPayload = {
            id: finalPeriodId,
            name: finalPeriodName,
            description: finalPeriodDescription
        };

        const newQuiz = {
            id: window.dataManager.generateQuizId(formData.quizName),
            name: formData.quizName,
            description: formData.quizDesc || `${formData.quizName}的详细内容`,
            difficulty: formData.difficulty,
            estimatedTime: formData.estimatedTime || "未知",
            questions: formData.questions
        };

        return { periodPayload, newQuiz };
    }
    */

    /**
     * 重置表单 (注释掉)
     */
    /*
    resetForm() {
        if (this.addQuizForm) this.addQuizForm.reset();
        if (this.quizDataInput) this.quizDataInput.value = '';
        if (this.subjectSelect) this.subjectSelect.value = ""; 
        if (this.periodSelect) this.periodSelect.innerHTML = '<option value="">请先选择学科</option>'; 
        this.hideCustomPeriodInput();
    }
    */

    /**
     * 删除题库
     */
    async deleteQuiz(subjectId, periodId, quizId) { // Marked async
        if (!confirm('确定要删除这个题库吗？此操作不可恢复。')) return;

        if (await window.dataManager.deleteQuiz(subjectId, periodId, quizId)) { // 改为异步
            this.updateQuizList();
            if (window.uiManager) window.uiManager.refreshCurrentPage();
            alert('题库已删除。');
            await this.checkStorageStatus(); // 删除后检查存储状态
        } else {
            alert('删除失败，题库可能不存在或已被删除。');
        }
    }

    /**
     * 编辑题库 (注释掉，因为依赖手动表单)
     */
    /*
    editQuiz(subjectId, periodId, quizId) {
        const quiz = window.dataManager.getQuiz(subjectId, periodId, quizId);
        if (!quiz) {
            alert('无法编辑：未找到题库。');
            return;
        }

        const allQuizData = window.dataManager.getData();
        const period = allQuizData[subjectId]?.periods[periodId];
        if (!period) {
            alert('无法编辑：未找到时期分类。');
            return;
        }

        if (confirm('将填充表单以编辑此题库。编辑完成后，您需要重新提交以保存更改。\n注意：为简化操作，原题库将先被删除。请确认是否继续？')) {
            this.fillEditForm(subjectId, periodId, quiz, period);
            (async () => { 
                await window.dataManager.deleteQuiz(subjectId, periodId, quizId); 
                this.updateQuizList();
                if (window.uiManager) window.uiManager.refreshCurrentPage();
                await this.checkStorageStatus(); 
            })();
            
            if (!this.adminPanel.classList.contains('active')) {
                this.adminPanel.classList.add('active');
            }
            if (this.quizNameInput) this.quizNameInput.focus();
        }
    }
    */

    /**
     * 填充编辑表单 (注释掉，因为依赖手动表单)
     */
    /*
    fillEditForm(subjectId, periodId, quiz, period) {
        if (!this.subjectSelect || !this.periodSelect || !this.customPeriodInput || 
            !this.quizNameInput || !this.quizDescInput || !this.difficultySelect ||
            !this.estimatedTimeInput || !this.quizDataInput) {
            console.warn("fillEditForm: Manual form elements not available.");
            return;
        }
        this.subjectSelect.value = subjectId; 
        
        setTimeout(() => { 
            this.updatePeriodOptions(); 

            const periodOptionExists = Array.from(this.periodSelect.options)
                .some(option => option.value === periodId);

            if (periodOptionExists && periodId !== 'custom') {
                this.periodSelect.value = periodId;
            } else {
                this.periodSelect.value = 'custom';
                this.customPeriodInput.value = period.name;
            }
            this.handlePeriodSelectChange(); 

            this.quizNameInput.value = quiz.name;
            this.quizDescInput.value = quiz.description || '';
            this.difficultySelect.value = quiz.difficulty; 
            this.estimatedTimeInput.value = quiz.estimatedTime || ''; 
            this.quizDataInput.value = JSON.stringify(quiz.questions, null, 2);
        }, 50);
    }
    */

    /**
     * 更新题库列表
     */
    updateQuizList() {
        if (!this.quizListContent || !window.dataManager) return;
        
        const allQuizData = window.dataManager.getData();
        let listHTML = '';
        let quizCount = 0;

        Object.values(allQuizData).forEach(subject => {
            if (subject && subject.periods && typeof subject.periods === 'object') {
                Object.values(subject.periods).forEach(period => {
                    if (period && period.quizzes && Array.isArray(period.quizzes)) {
                        period.quizzes.forEach(quiz => {
                            quizCount++;
                            listHTML += this.createQuizListItem(subject, period, quiz);
                        });
                    }
                });
            }
        });

        this.quizListContent.innerHTML = quizCount > 0 ? 
            listHTML : 
            '<p style="text-align:center;color:var(--text-muted);">暂无题库</p>';
    }

    /**
     * 创建题库列表项 (移除了编辑按钮，因为编辑功能依赖手动表单)
     */
    createQuizListItem(subject, period, quiz) {
        return `
            <div class="quiz-item">
                <div>
                    <strong>${quiz.name}</strong><br>
                    <small>${subject.name} - ${period.name} (${quiz.questions?.length || 0}题)</small>
                </div>
                <div>
                    <!-- 编辑按钮注释掉 
                    <button class="edit-btn" onclick="window.adminManager.editQuiz('${subject.id}', '${period.id}', '${quiz.id}')">
                        编辑
                    </button>
                    -->
                    <button class="delete-btn" onclick="window.adminManager.deleteQuiz('${subject.id}', '${period.id}', '${quiz.id}')">
                        删除
                    </button>
                </div>
            </div>
        `;
    }

    // --- MODIFIED backupData START ---
    /**
     * 备份数据 - 新逻辑：同时备份题库和用户进度
     */
    async backupData() {
        try {
            if (!window.dataManager || !window.progressManager) {
                alert('数据或进度管理器未就绪，无法备份。');
                return;
            }

            // 同时获取题库数据和用户进度数据
            const quizDataContent = window.dataManager.getData();
            const progressDataContent = window.progressManager.userProgress; // 直接获取整个 progress 对象

            if (!quizDataContent || !progressDataContent) {
                alert('获取核心数据失败，无法创建备份。');
                return;
            }

            // 创建一个包含两者的新备份结构
            const fullBackupData = {
                version: window.AppConfig.APP_CONFIG.version,
                exportTime: new Date().toISOString(),
                // 新结构的核心：明确区分题库和用户进度
                data: {
                    quizData: quizDataContent,
                    userProgress: progressDataContent
                }
            };

            const blob = new Blob([JSON.stringify(fullBackupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            // 建议给备份文件起一个更明确的名字
            a.download = `art_quiz_FULL_backup_${dateString}.json`; 
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('完整的应用数据（题库+学习记录）已备份成功！');
            
        } catch (error) {
            console.error('备份数据失败:', error);
            alert('数据备份失败：' + error.message);
        }
    }
    // --- MODIFIED backupData END ---


    // --- MODIFIED restoreData START ---
    /**
     * 恢复数据 - 新逻辑：能识别新备份格式并分发数据
     */
    async restoreData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsedFileContent = JSON.parse(e.target.result);

                // 检查新的、更严格的备份文件结构
                if (!parsedFileContent || !parsedFileContent.data || !parsedFileContent.data.quizData || !parsedFileContent.data.userProgress) {
                    // 尝试兼容旧格式
                    const isOldFormat = parsedFileContent && parsedFileContent.data && !parsedFileContent.data.quizData;
                    if (isOldFormat && confirm('这是一个旧格式的备份文件，只包含题库数据。是否只恢复题库？\n\n（你的学习记录将不会被改变）')) {
                        await window.dataManager.restoreData(parsedFileContent.data);
                        alert('旧格式备份中的题库数据已恢复！');
                    } else {
                         throw new Error("备份文件格式不正确，必须包含 'data.quizData' 和 'data.userProgress'。");
                    }
                } else {
                    // 新格式，分别恢复
                    if (!confirm('检测到包含题库和学习记录的完整备份文件。确定要恢复吗？\n\n警告：这将完全覆盖你当前所有的题库和学习记录！此操作不可逆！')) {
                        event.target.value = ''; // 清空文件选择，以便可以再次选择
                        return;
                    }
                    
                    const dataToRestore = parsedFileContent.data;

                    // 1. 恢复题库
                    await window.dataManager.restoreData(dataToRestore.quizData);
                    console.log("题库数据已恢复。");

                    // 2. 恢复用户进度
                    await window.progressManager.restoreProgress(dataToRestore.userProgress);
                    console.log("用户学习记录已恢复。");
                    
                    alert('数据恢复成功！应用将自动刷新以应用所有更改。');
                    // 强制刷新页面以确保所有模块都使用最新的恢复数据
                    location.reload(); 
                    return; // 刷新后后面的代码不会执行
                }

                // 只有在不刷新的情况下才执行下面的UI更新
                this.updateQuizList();
                if (window.uiManager) {
                    window.uiManager.refreshCurrentPage();
                    if(window.statisticsManager) window.statisticsManager.initStatisticsPage();
                    if(window.reviewManager) window.reviewManager.initReviewPage();
                }
                
            } catch (error) {
                console.error('恢复数据失败:', error);
                alert('恢复数据失败：' + error.message);
            } finally {
                event.target.value = '';
            }
        };
        
        reader.onerror = () => { alert('读取文件失败。'); event.target.value = ''; };
        reader.readAsText(file);
    }
    // --- MODIFIED restoreData END ---

    /**
     * 复制指令模板 (注释掉，因为依赖手动输入区域)
     */
    /*
    copyInstructionTemplate() {
        const instruction = `
请严格按照以下JSON格式生成题目数据 (一个包含多个题目对象的数组):
[
  {
    "section": "章节或主题名称 (例如：印象派的起源)",
    "question": "这里是题目的具体内容...?",
    "options": ["选项A的描述", "选项B的描述", "选项C的描述", "选项D的描述"],
    "correctAnswer": 0, // (0 代表选项A, 1 代表选项B, 以此类推, 必须是数字)
    "explanation": "这里是对正确答案的详细解析，可以解释为什么对，以及其他选项为什么错。"
  }
  // ...可以有更多类似的题目对象
]
确保每个题目对象都包含 "section", "question", "options" (一个字符串数组), "correctAnswer" (一个数字), 和 "explanation" (字符串) 这五个字段。
options数组至少包含两个选项。correctAnswer的数字必须在有效选项的索引范围内。
        `.trim();

        if (this.copyInstructionBtn && this.quizDataInput) {
            this.copyToClipboard(instruction, this.copyInstructionBtn, '📄 获取AI生成指令', '✅ 已复制!');
        } else {
             // Fallback if button/input not available (e.g., if commenting out parts)
            navigator.clipboard.writeText(instruction).then(() => {
                alert('AI生成指令已复制到剪贴板!');
            }).catch(err => {
                console.error('无法自动复制: ', err);
                alert('❌ 复制失败，请手动复制以下指令:\n\n' + instruction);
            });
        }
    }
    */

    addPromptRow() {
        const tpl = document.getElementById('promptRowTpl');
        if (!tpl) {
            console.error("Prompt row template (promptRowTpl) not found!");
            return;
        }
        const row = tpl.content.firstElementChild.cloneNode(true);

        const subjSel = row.querySelector('.subject-select');
        const periodSel = row.querySelector('.period-select');

        this.fillSubjectOptions(subjSel); 
        
        subjSel.addEventListener('change', () => {
            this.fillPeriodOptions(subjSel.value, periodSel); 
        });
        subjSel.dispatchEvent(new Event('change')); 

        row.querySelector('.remove-row').onclick = () => {
            if (this.multiPromptRows.children.length > 1) {
                row.remove();
            } else {
                alert("至少需要保留一项学科/数量组合。");
            }
        };
        this.multiPromptRows.appendChild(row);
    }

    fillSubjectOptions(selectEl) {
        if (!selectEl || !window.AppConfig || !window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA) return;
        
        selectEl.innerHTML = '<option value="">请选择学科</option>'; 
        const subjects = window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA;
        
        for (const subjectId in subjects) {
            if (subjects.hasOwnProperty(subjectId)) {
                const opt = document.createElement('option');
                opt.value = subjectId;
                opt.text = subjects[subjectId].name;
                selectEl.appendChild(opt);
            }
        }
    }

    fillPeriodOptions(subjectId, selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">请选择时期/分类</option>'; 
        
        if (subjectId && window.dataManager) {
            const options = window.dataManager.getPeriodOptions(subjectId);
            if (options && options.length > 0) {
                options.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.text = p.name;
                    selectEl.appendChild(opt);
                });
            } else {
                selectEl.innerHTML = '<option value="">该学科暂无预设分类</option>';
            }
        } else if (!subjectId) {
             selectEl.innerHTML = '<option value="">请先选择学科</option>';
        }
    }

    generateSmartPrompt() {
        const rowsData = [...this.multiPromptRows.querySelectorAll('.prompt-row')].map(r => {
            return {
                subjectId: r.querySelector('.subject-select').value,
                subjectText: r.querySelector('.subject-select').selectedOptions[0]?.text, 
                periodId: r.querySelector('.period-select').value,
                periodText: r.querySelector('.period-select').selectedOptions[0]?.text || '综合', 
                numQuestions: +r.querySelector('.count-input').value || 10 
            };
        }).filter(r => r.subjectId); 

        if (rowsData.length === 0) {
            alert('至少添加一行完整配置！');
            return;
        }

        const difficultyValue = this.aiDifficultySelect.value;
        const difficultyText = this.aiDifficultySelect.options[this.aiDifficultySelect.selectedIndex]?.text;
        const estimatedTime = this.aiEstimatedTimeSelect.value;
        const hasReference = this.aiHasReference.value;

        const globalSettings = { difficultyValue, difficultyText, estimatedTime, hasReference };
        const prompt = this.buildMultiPrompt(rowsData, globalSettings); 

        this.copyToClipboard(prompt, this.generatePromptBtn, this.generatePromptBtn.textContent, '✅ Prompt已复制!', () => {
            alert('✅ 智能提示词已复制到剪贴板！\n请粘贴到AI工具中获取JSON结果。');
        });
    }

    // ========== MODIFIED buildMultiPrompt METHOD STARTS HERE ==========
    buildMultiPrompt(rows, globalSettings) {
        const isEnglishCultivation = rows.some(r => r.subjectId === 'english_cultivation_pavilion'); // 检查是否有平行时空

        if (isEnglishCultivation) {
            // 确保所有行都是平行时空，或者只处理第一个平行时空的行
            // 为简化，我们假设如果检测到，就都按平行时空处理，或在UI上限制混搭
            const list = rows.map(r => `- 境界 "${r.periodText}" (来自 "${r.subjectText}") 各约 ${r.numQuestions} 题`).join('\n');
            const exampleSubjectText = rows[0] ? rows[0].subjectText : '平行时空';
            const examplePeriodText = rows[0] ? rows[0].periodText : '练气境';

            return `请按下列要求返回 仅包含 JSON 的回答，不要加入任何额外解释或 Markdown 标记。
JSON 结构应该是一个对象，包含一个名为 "quizzes" 的数组，该数组中将包含多个题库对象，每个对象对应下列一项：
${list}
对于所有题库，请统一使用以下全局设置：
难度 (difficulty): "${globalSettings.difficultyValue}" (${globalSettings.difficultyText})
预计用时 (estimatedTime): "${globalSettings.estimatedTime}"
${globalSettings.hasReference === 'yes' ? '- 我将提供核心学习资料，请重点围绕这些内容出题 (资料将另行粘贴给您)。' : '- 请自主生成题目内容，确保紧密围绕每个条目指定的境界和核心目标。'}
重要：题库类型应为 "essay_ai_feedback"。题目结构应包含 "question", "modelAnswer", "explanation"。选项固定为 ["标记：AI互动完成-感觉良好", "标记：AI互动完成-仍需复习"]，correctAnswer 固定为 0。
输出格式示例 (严格遵守此JSON结构):
\`\`\`json
{
"quizzes": [
{ // 第一个境界对应的题库
"subject": "${exampleSubjectText}",
"period": "${examplePeriodText}",
"name": "自动生成的题库名称 (例如: ${exampleSubjectText} - ${examplePeriodText} ${globalSettings.difficultyText}练习)",
"description": "自动生成的题库描述 (例如: 关于 ${exampleSubjectText} 下 ${examplePeriodText} 的题目)",
"difficulty": "${globalSettings.difficultyValue}",
"estimatedTime": "${globalSettings.estimatedTime}",
"quizType": "essay_ai_feedback", // 固定为此类型
"questions": [
{
"section": "相关技能板块 (例如：词汇应用)",
"question": "题目内容，例如：请描述你最喜欢的季节，并说明原因。",
"modelAnswer": "My favorite season is autumn. I like it because the weather is cool and comfortable, not too hot or too cold. The leaves on the trees change to beautiful colors like red, orange, and yellow. It's also a good time for hiking and enjoying nature.",
"explanation": "评分要点：1. 清晰表达最喜欢的季节。2. 至少给出两个合理的原因。3. 词汇使用基本准确，句子结构基本正确。4. 时态一致性（一般现在时）。",
"options": ["标记：AI互动完成-感觉良好", "标记：AI互动完成-仍需复习"], // 固定选项
"correctAnswer": 0 // 固定值
}
// ...更多题目
]
}
// ...更多题库对象
]
}
\`\`\`
重要提醒:
JSON有效性: 确保输出是严格有效的JSON。
字段完整性: 每个题库对象必须包含 subject, period, name, description, difficulty, estimatedTime, quizType, 和 questions 数组。
每个题目对象必须包含 section, question, modelAnswer (字符串), explanation (字符串), options (固定的两个字符串数组), 和 correctAnswer (固定为0)。
内容质量: 题目应具开放性，能引导用户进行思考和表达。模型答案应具有参考价值，解析应清晰指出评价维度。
`.trim();
        } else {
            // 原有的选择题 Prompt 生成逻辑
            const listMCQ = rows.map(r => `- 学科 "${r.subjectText}" / 时期/分类 "${r.periodText}" 各约 ${r.numQuestions} 题`).join('\n');
            const exampleSubjectTextMCQ = rows[0] ? rows[0].subjectText : '学科示例';
            const examplePeriodTextMCQ = rows[0] ? rows[0].periodText : '时期示例';

            return `请按下列要求返回 仅包含 JSON 的回答，不要加入任何额外解释或 Markdown 标记。
JSON 结构应该是一个对象，包含一个名为 "quizzes" 的数组，该数组中将包含多个题库对象，每个对象对应下列一项：
${listMCQ}
对于所有题库，请统一使用以下全局设置：
难度 (difficulty): "${globalSettings.difficultyValue}" (${globalSettings.difficultyText})
预计用时 (estimatedTime): "${globalSettings.estimatedTime}"
${globalSettings.hasReference === 'yes' ? '- 我将提供核心学习资料，请重点围绕这些内容出题 (资料将另行粘贴给您)。' : '- 请自主生成题目内容，确保紧密围绕每个条目指定的学科和时期/分类的核心知识点。'}
输出格式示例 (严格遵守此JSON结构，为每个条目生成一个题库对象):
\`\`\`json
{
"quizzes": [
{ // 第一个条目对应的题库
"subject": "${exampleSubjectTextMCQ}",
"period": "${examplePeriodTextMCQ}",
"name": "自动生成的题库名称 (例如: ${exampleSubjectTextMCQ} - ${examplePeriodTextMCQ} ${globalSettings.difficultyText}练习)",
"description": "自动生成的题库描述 (例如: 关于 ${exampleSubjectTextMCQ} 下 ${examplePeriodTextMCQ} 的题目)",
"difficulty": "${globalSettings.difficultyValue}",
"estimatedTime": "${globalSettings.estimatedTime}",
"questions": [
{ // 单选题示例
"section": "相关章节或主题 (例如：该时期的起源)",
"question": "题目内容...？(确保问题清晰、无歧义)",
"options": [
"选项A的完整描述",
"选项B的完整描述",
"选项C的完整描述",
"选项D的完整描述"
],
"correctAnswer": 0,
"explanation": "对正确答案的详细解析。请解释为什么这个选项是正确的，并可简要说明其他选项为什么错误。如果适用，可以提供相关的背景知识或拓展信息。"
},
{ // 多选题示例 (如果适用)
"section": "相关章节或主题 (多选)",
"question": "多选题题目内容...？",
"options": ["选项W", "选项X", "选项Y", "选项Z"],
"correctAnswers": [0, 2],
"explanation": "多选题的详细解析..."
}
// ...更多题目
]
}
// ...更多题库对象
]
}
\`\`\`
重要提醒:
JSON有效性: 确保输出是严格有效的JSON。
字段完整性: 每个题库对象必须包含 subject, period, name, description, difficulty, estimatedTime, 和 questions 数组。
每个题目对象必须包含 section, question, options (至少2个选项的数组), explanation 字段。
对于单选题，请使用 \`correctAnswer\` 字段 (值为0到options.length-1的数字)。
对于多选题 (如果生成)，请使用 \`correctAnswers\` 字段 (值为一个包含正确选项索引的数组，例如 \`[0, 2]\`，数组长度至少为2)。不要同时为一个题目提供 \`correctAnswer\` 和 \`correctAnswers\`。
内容质量: 题目应具启发性，选项具迷惑性，解析清晰详尽。
信息准确性: 确保内容准确。
`.trim();
        }
    }
    // ========== MODIFIED buildMultiPrompt METHOD ENDS HERE ==========


    copyToClipboard(text, button, originalText, successText, callback) {
        navigator.clipboard.writeText(text).then(() => {
            if (button) {
                button.textContent = successText;
                button.disabled = true;
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2500);
            }
            if (callback) callback();
        }).catch(err => {
            console.error('无法自动复制: ', err);
            // Fallback to textarea if it exists and is for this purpose
            // Since we are commenting out the manual quizDataInput, this fallback needs review
            // if (this.quizDataInput) {
            //     this.quizDataInput.value = text; 
            //     alert('❌ 复制失败，已将内容输出到"题目数据"框中，请手动复制。');
            // } else {
                alert('❌ 复制失败，请手动复制以下内容 (已输出到控制台)。\n\n' + text);
                console.log("Prompt to copy manually:\n", text);
            // }
        });
    }

    showUploadModal(show = true) {
        console.log(`[AdminManager Debug] showUploadModal called with show = ${show}`); // 确认方法被调用和参数

        if (!this.aiUploadModal) {
            console.error("[AdminManager Debug] AI Upload Modal element (this.aiUploadModal) is NULL inside showUploadModal!");
            return;
        }
        console.log("[AdminManager Debug] this.aiUploadModal element is:", this.aiUploadModal);

        // 记录当前模态框的 display 状态 (修改前后)
        console.log("[AdminManager Debug] Before classList.toggle - aiUploadModal.classList:", Array.from(this.aiUploadModal.classList).join(', '));
        console.log("[AdminManager Debug] Before classList.toggle - computed display style:", getComputedStyle(this.aiUploadModal).display);

        this.aiUploadModal.classList.toggle('active', show);

        console.log("[AdminManager Debug] After classList.toggle - aiUploadModal.classList:", Array.from(this.aiUploadModal.classList).join(', '));
        // 强制浏览器重新计算样式，然后获取最新的 display 值
        // 这可能不总是在同一个tick内生效，但可以尝试
        requestAnimationFrame(() => {
            console.log("[AdminManager Debug] After classList.toggle (next frame) - computed display style:", getComputedStyle(this.aiUploadModal).display);
        });


        if (show) {
            console.log("[AdminManager Debug] `show` is true. Calling _updateBodyOverflow, switchTab, resetModalInputs.");
            if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
                window.uiManager._updateBodyOverflow();
                console.log("[AdminManager Debug] _updateBodyOverflow called.");
            } else {
                console.warn("[AdminManager Debug] uiManager or _updateBodyOverflow not available.");
            }
            this.switchTab('paste'); // 默认显示粘贴
            this.resetModalInputs();
        } else {
            console.log("[AdminManager Debug] `show` is false. Calling _updateBodyOverflow.");
            if (window.uiManager && typeof window.uiManager._updateBodyOverflow === 'function') {
                window.uiManager._updateBodyOverflow();
                console.log("[AdminManager Debug] _updateBodyOverflow called for hiding modal.");
            } else {
                console.warn("[AdminManager Debug] uiManager or _updateBodyOverflow not available for hiding modal.");
            }
        }
        console.log("[AdminManager Debug] showUploadModal finished execution.");
    }

    resetModalInputs() {
        if (this.aiJsonInput) this.aiJsonInput.value = '';
        if (this.aiFileInput) this.aiFileInput.value = '';
        if (this.fileInfoDisplay) this.fileInfoDisplay.style.display = 'none';
        this.selectedFile = null;
    }

    switchTab(tabName) {
        if (this.pasteDataTab) this.pasteDataTab.classList.toggle('active', tabName === 'paste');
        if (this.uploadFileTab) this.uploadFileTab.classList.toggle('active', tabName === 'upload');
        if (this.pasteMethodDiv) this.pasteMethodDiv.classList.toggle('active', tabName === 'paste');
        if (this.uploadMethodDiv) this.uploadMethodDiv.classList.toggle('active', tabName === 'upload');
        this.resetModalInputs(); 
    }

    handleFileSelect(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json" || file.name.endsWith(".json")) {
                if (this.fileNameDisplay) this.fileNameDisplay.textContent = file.name;
                if (this.fileSizeDisplay) this.fileSizeDisplay.textContent = `${(file.size / 1024).toFixed(2)} KB`;
                if (this.fileInfoDisplay) this.fileInfoDisplay.style.display = 'block';
                this.selectedFile = file;
            } else {
                alert("错误：请选择一个.json文件");
                if (this.fileInfoDisplay) this.fileInfoDisplay.style.display = 'none';
                if (this.aiFileInput) this.aiFileInput.value = '';
                this.selectedFile = null;
            }
        } else {
            if (this.fileInfoDisplay) this.fileInfoDisplay.style.display = 'none';
            this.selectedFile = null;
        }
    }

    handleFileDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFileSelect(files);
    }

    async processAIDataImport() { // Marked async
        const activeTab = this.pasteDataTab?.classList.contains('active') ? 'paste' : 'upload'; // Use optional chaining
        let rawJsonData;
        let importFileName = "粘贴的数据";

        if (activeTab === 'paste') {
            if (!this.aiJsonInput) {
                alert('JSON输入框未找到！');
                return;
            }
            rawJsonData = this.aiJsonInput.value.trim();
            if (!rawJsonData) {
                alert('请粘贴有效的JSON数据！');
                return;
            }
            await this.processJsonContent(rawJsonData, importFileName); // Await here
        } else { 
            if (!this.selectedFile) {
                alert('请选择一个JSON文件上传！');
                return;
            }
            importFileName = this.selectedFile.name;
            const reader = new FileReader();
            reader.onload = async (e) => await this.processJsonContent(e.target.result, importFileName); // Await here
            reader.onerror = () => alert('读取文件失败！');
            reader.readAsText(this.selectedFile);
        }
    }

    async processJsonContent(jsonString, sourceName) { // Marked async
        try {
            const parsedData = JSON.parse(jsonString);
            const result = await this.importAIData(parsedData, sourceName); // Await here
            await this.showImportResult(result, sourceName); // Await here
            
            if (result.importedCount > 0 || result.replacedCount > 0) {
                this.updateQuizList();
                if (window.uiManager) window.uiManager.refreshCurrentPage();
            }
            this.showUploadModal(false);
        } catch (e) {
            alert(`JSON解析失败！请检查数据格式。\n错误: ${e.message}`);
        }
    }

    async importAIData(parsedData, sourceName) { // Marked async
        let quizzesToProcess = [];
        let singleQuizFromQuestionsArray = false;

        if (Array.isArray(parsedData)) { 
            const tempQuizForValidation = { id: 'temp_direct_array', name: 'Temp', questions: parsedData };
            if (!window.dataManager.validateQuizData(tempQuizForValidation)) {
                 throw new Error(`导入的题目数组数据格式不正确或不完整。详情请查看控制台。`);
            }
            quizzesToProcess.push({ questions: parsedData }); 
            singleQuizFromQuestionsArray = true;
        } else if (parsedData && Array.isArray(parsedData.quizzes)) { 
            let allValid = true;
            for (const quiz of parsedData.quizzes) {
                const tempQuizForValidation = { ...quiz, id: quiz.id || 'temp_import_obj' };
                if (!window.dataManager.validateQuizData(tempQuizForValidation)) {
                    allValid = false;
                    console.error("Invalid quiz structure in imported 'quizzes' array:", quiz);
                    break; 
                }
            }
            if (!allValid) {
                 throw new Error(`导入的 "quizzes" 数组中包含格式不正确或不完整的题库对象。详情请查看控制台。`);
            }
            quizzesToProcess = parsedData.quizzes;
        } else {
            throw new Error('导入的数据格式无法识别。请确保是题目数组或包含 "quizzes" 数组的对象。');
        }

        if (quizzesToProcess.length === 0) {
            throw new Error('导入的数据中没有找到任何题库或题目。');
        }

        return await this.processQuizzes(quizzesToProcess, singleQuizFromQuestionsArray, sourceName); // Await here
    }

    async processQuizzes(quizzesToProcess, singleQuizFromQuestionsArray, sourceName) { // Marked async
        const targetSubjectIdOverride = this.importSubjectSelect.value;
        const conflictStrategy = this.conflictResolutionSelect.value;
        const result = { importedCount: 0, skippedCount: 0, replacedCount: 0, failedCount: 0 };

        for (const [idx, aiQuiz] of quizzesToProcess.entries()) { // Use for...of for await
            try {
                const quizData = this.prepareImportQuizData(aiQuiz, singleQuizFromQuestionsArray, targetSubjectIdOverride, sourceName, idx);
                await this.handleQuizConflict(quizData, conflictStrategy, result); // Await here
            } catch (e) {
                result.failedCount++;
                console.error(`导入题库 "${aiQuiz.name || `来自 ${sourceName} 的条目 ${idx+1}`}" 失败: ${e.message}`, e);
            }
        }
        return result;
    }

    prepareImportQuizData(aiQuiz, singleQuizFromQuestionsArray, targetSubjectIdOverride, sourceName, idx) {
        let subjectIdToUse, periodPayload, quizName, quizDesc, difficulty, estimatedTime, questions;

        if (singleQuizFromQuestionsArray) {
            const firstPromptRowElement = this.multiPromptRows.querySelector('.prompt-row'); 
            let formSubjectId = '';
            let formPeriodId = '';
            let formPeriodName = '综合'; 
            let formSubjectName = '综合学科';

            if (firstPromptRowElement) {
                const firstSubjectSelect = firstPromptRowElement.querySelector('.subject-select');
                const firstPeriodSelect = firstPromptRowElement.querySelector('.period-select');
                formSubjectId = firstSubjectSelect ? firstSubjectSelect.value : '';
                if (formSubjectId && firstSubjectSelect) formSubjectName = firstSubjectSelect.options[firstSubjectSelect.selectedIndex]?.text;
                formPeriodId = firstPeriodSelect ? firstPeriodSelect.value : '';
                if (formPeriodId && firstPeriodSelect) formPeriodName = firstPeriodSelect.options[firstPeriodSelect.selectedIndex]?.text;
            }

            if (!formSubjectId) throw new Error("无法确定学科用于导入的题目数组。请在AI助手区域至少指定一个学科。");
            
            subjectIdToUse = formSubjectId;
            let periodDescFromForm = "AI生成分类";
             if (formPeriodId && window.dataManager) {
                const foundPeriodOption = window.dataManager.getPeriodOptions(subjectIdToUse)
                                          .find(p => p.id === formPeriodId);
                if (foundPeriodOption) periodDescFromForm = foundPeriodOption.description;
            }

            periodPayload = {
                id: formPeriodId || `ai_period_${Date.now()}`,
                name: formPeriodName,
                description: periodDescFromForm
            };
            
            quizName = `AI导入: ${formSubjectName} - ${periodPayload.name} (${this.aiDifficultySelect.options[this.aiDifficultySelect.selectedIndex].text})`;
            quizDesc = `通过AI助手导入的关于 ${formSubjectName} - ${periodPayload.name} 的题目。来源: ${sourceName}`;
            difficulty = this.aiDifficultySelect.value; 
            estimatedTime = this.aiEstimatedTimeSelect.value; 
            questions = aiQuiz.questions;

        } else { 
            subjectIdToUse = this.resolveSubjectId(aiQuiz, targetSubjectIdOverride);
            periodPayload = this.resolvePeriodData(aiQuiz, subjectIdToUse);
            quizName = aiQuiz.name || `AI导入题库 (${sourceName} - ${idx+1})`;
            quizDesc = aiQuiz.description || `AI导入自 "${sourceName}"`;
            difficulty = ['easy', 'medium', 'hard'].includes(aiQuiz.difficulty) ? aiQuiz.difficulty : this.aiDifficultySelect.value;
            estimatedTime = aiQuiz.estimatedTime || this.aiEstimatedTimeSelect.value;
            questions = aiQuiz.questions || [];
        }

        if (!questions || questions.length === 0) {
            throw new Error(`题库 "${quizName}" 不包含任何题目。`);
        }

        const newQuizData = {
            id: window.dataManager.generateQuizId(quizName),
            name: quizName,
            description: quizDesc,
            difficulty: difficulty,
            estimatedTime: estimatedTime,
            questions: questions
        };

        if (!window.dataManager.validateQuizData(newQuizData)) {
            throw new Error(`最终生成的题库 "${newQuizData.name}" 数据结构校验失败。`);
        }
        return { subjectIdToUse, periodPayload, newQuizData };
    }

    resolveSubjectId(aiQuiz, targetSubjectIdOverride) {
        let subjectIdToUse = targetSubjectIdOverride; 
        
        if (!subjectIdToUse && aiQuiz.subject) { 
            subjectIdToUse = this.subjectNameMap[aiQuiz.subject] || 
                           (window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA[aiQuiz.subject] ? aiQuiz.subject : null) || 
                           Object.keys(window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA) 
                               .find(key => window.AppConfig.DEFAULT_INITIAL_QUIZ_DATA[key].name === aiQuiz.subject);
        }
        
        if (!subjectIdToUse) { 
            const firstPromptRowElement = this.multiPromptRows.querySelector('.prompt-row');
            if (firstPromptRowElement) {
                const firstSubjectSelect = firstPromptRowElement.querySelector('.subject-select');
                if (firstSubjectSelect && firstSubjectSelect.value) {
                     subjectIdToUse = firstSubjectSelect.value;
                }
            }
        }
        
        if (!subjectIdToUse) {
            throw new Error(`无法确定题库 "${aiQuiz.name || 'JSON条目'}" 的学科。请在JSON中提供 "subject" 字段，或在导入设置中指定学科，或在AI助手表单中设置默认学科。`);
        }
        return subjectIdToUse;
    }

    resolvePeriodData(aiQuiz, subjectIdToUse) {
        const periodNameFromAIOriginal = aiQuiz.period || "未分类";
        let periodIdFromAI = window.dataManager.generateQuizId(periodNameFromAIOriginal); 
        let periodDescFromAI = `关于 ${periodNameFromAIOriginal} 的分类`;
        let resolvedPeriodName = periodNameFromAIOriginal; 

        if (window.dataManager) {
            const existingPeriodOption = window.dataManager.getPeriodOptions(subjectIdToUse)
                .find(p => p.name === periodNameFromAIOriginal || p.id === aiQuiz.period); 
            
            if (existingPeriodOption) {
                periodIdFromAI = existingPeriodOption.id;
                resolvedPeriodName = existingPeriodOption.name; 
                periodDescFromAI = existingPeriodOption.description;
            }
        }
        
        return {
            id: periodIdFromAI,
            name: resolvedPeriodName, 
            description: periodDescFromAI
        };
    }


    async handleQuizConflict(quizData, conflictStrategy, result) { // Marked async
        const { subjectIdToUse, periodPayload, newQuizData } = quizData;
        
        let existingQuiz = null;
        const subjectData = window.dataManager.getData()[subjectIdToUse];
        
        if (subjectData && subjectData.periods && subjectData.periods[periodPayload.id]) {
            existingQuiz = subjectData.periods[periodPayload.id].quizzes
                .find(q => q.name === newQuizData.name);
        }

        if (existingQuiz) {
            if (conflictStrategy === 'skip') {
                result.skippedCount++;
                console.log(`Skipped existing quiz: ${newQuizData.name}`);
            } else if (conflictStrategy === 'replace') {
                if (subjectData && subjectData.periods && subjectData.periods[periodPayload.id]) {
                    await window.dataManager.deleteQuiz(subjectIdToUse, periodPayload.id, existingQuiz.id); // 改为异步
                }
                await window.dataManager.addQuiz(subjectIdToUse, periodPayload, newQuizData); // 改为异步
                result.replacedCount++; 
                console.log(`Replaced quiz: ${newQuizData.name}`);
            }
        } else {
            await window.dataManager.addQuiz(subjectIdToUse, periodPayload, newQuizData); // 改为异步
            result.importedCount++;
        }
    }

    async showImportResult(result, sourceName) { // Marked async
        let summaryMessage = `导入完成！来源: ${sourceName}\n\n`;
        summaryMessage += `成功导入: ${result.importedCount} 个题库\n`;
        if (result.skippedCount > 0) summaryMessage += `跳过同名: ${result.skippedCount} 个题库\n`;
        if (result.replacedCount > 0) summaryMessage += `替换同名: ${result.replacedCount} 个题库\n`;
        if (result.failedCount > 0) summaryMessage += `导入失败: ${result.failedCount} 个题库 (详情请查看控制台)\n`;

        alert(summaryMessage);
        await this.checkStorageStatus(); // 导入完成后检查存储状态
    }

    // ============ 新增：存储管理功能 ============

    /**
     * 检查存储状态
     */
    async checkStorageStatus() {
        try {
            if (!this.storageStatusInfo) {
                console.warn("AdminManager: storageStatusInfo element not found. Cannot display storage status.");
                return;
            }

            if (!window.storageManager) {
                this.displayStorageInfo({ type: 'localStorage (fallback)', supported: true });
                console.warn("StorageManager not available, displaying fallback info.");
                return;
            }

            const storageInfo = await window.storageManager.getStorageInfo();
            const health = await window.storageManager.checkStorageHealth();
            
            this.displayStorageInfo(storageInfo, health);
            
            if (health && health.warnings && health.warnings.length > 0) {
                const warningMsg = `存储状态警告：\n${health.warnings.join('\n')}\n\n建议：\n${(health.recommendations || []).join('\n')}`;
                console.warn(warningMsg);
                
                if (health.status === 'critical') {
                    // alert(warningMsg); // Avoid alert if panel is not main focus
                }
            }
        } catch (error) {
            console.error('检查存储状态失败:', error);
            if (this.storageStatusInfo) { // Check if element exists before trying to write error to it
                 this.displayStorageInfo({ type: 'Error checking storage', error: error.message });
            }
        }
    }

    /**
     * 显示存储信息
     */
    displayStorageInfo(storageInfo, health = null) {
        if (!this.storageStatusInfo) return;

        const isFallback = storageInfo.type && storageInfo.type.toLowerCase().includes('localstorage');
        let html = `
            <div class="storage-info-item">
                <span class="storage-label">存储类型：</span>
                <span class="storage-value ${isFallback ? 'storage-fallback' : 'storage-good'}">${storageInfo.type || '未知'}</span>
            </div>`;

        if (storageInfo.quota) {
            const usagePercentage = parseFloat(storageInfo.quota.percentage) || 0;
            let statusClass = 'storage-good';
            if (usagePercentage > 90) statusClass = 'storage-critical';
            else if (usagePercentage > 80) statusClass = 'storage-warning';
            
            html += `
                <div class="storage-info-item">
                    <span class="storage-label">存储使用：</span>
                    <span class="storage-value ${statusClass}">${storageInfo.quota.used || 'N/A'} / ${storageInfo.quota.total || 'N/A'} (${storageInfo.quota.percentage || '0'}%)</span>
                </div>
                <div class="storage-usage-bar">
                    <div class="storage-usage-fill ${statusClass}" style="width: ${storageInfo.quota.percentage || '0'}%"></div>
                </div>`;
        }

        if (health) {
            const statusClass = health.status === 'good' ? 'storage-good' : 
                               health.status === 'warning' ? 'storage-warning' : 
                               health.status === 'critical' ? 'storage-critical' : 'storage-neutral';
            html += `
                <div class="storage-info-item">
                    <span class="storage-label">健康状态：</span>
                    <span class="storage-value ${statusClass}">${this.getHealthStatusText(health.status)}</span>
                </div>`;

            if (health.warnings && health.warnings.length > 0) {
                html += `
                    <div class="storage-warnings">
                        <strong>⚠️ 警告：</strong>
                        <ul>
                            ${health.warnings.map(w => `<li>${w}</li>`).join('')}
                        </ul>
                    </div>`;
            }
             if (health.recommendations && health.recommendations.length > 0) {
                html += `
                    <div class="storage-recommendations">
                        <strong>💡 建议：</strong>
                        <ul>
                            ${health.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>`;
            }
        }

        if (storageInfo.stores && Object.keys(storageInfo.stores).length > 0) {
            html += `<div class="storage-stores">
                <strong>📊 存储详情：</strong>`;
            Object.entries(storageInfo.stores).forEach(([storeName, storeInfo]) => {
                html += `
                    <div class="storage-store-item">
                        <span>${storeName}: ${storeInfo.itemCount || 0} 项，${storeInfo.estimatedSize || 'N/A'}</span>
                    </div>`;
            });
            html += `</div>`;
        }
        
        if (storageInfo.error) {
             html += `<div class="storage-error"><strong>错误:</strong> ${storageInfo.error}</div>`;
        }


        this.storageStatusInfo.innerHTML = html;
    }

    /**
     * 获取健康状态文本
     */
    getHealthStatusText(status) {
        const statusMap = {
            'good': '✅ 良好',
            'warning': '⚠️ 警告',
            'critical': '🚨 严重',
            'limited': '⚪ 受限',
            'unknown': '❔ 未知'
        };
        return statusMap[status] || status || '未知';
    }

    /**
     * 清理存储
     */
    async cleanupStorage() {
        try {
            if (!window.storageManager || typeof window.storageManager.cleanupOldBackups !== 'function') {
                alert('存储管理器不可用或功能不全，无法执行部分清理操作。');
                // Still attempt localStorage cleanup
            }

            const confirmMsg = '存储清理操作可能包括：\n' +
                             '• 清理旧的内部备份（如果存储管理器支持）\n' +
                             '• 尝试压缩数据结构（通过重新保存）\n' +
                             '• 移除localStorage中的紧急备份数据\n\n' +
                             '确定要继续吗？此操作通常是安全的，但建议先导出数据。';

            if (!confirm(confirmMsg)) return;

            let messages = [];

            if (window.storageManager && typeof window.storageManager.cleanupOldBackups === 'function') {
                await window.storageManager.cleanupOldBackups(10); // Keep recent 10
                messages.push("旧内部备份已清理 (保留最近10个)。");
            }

            if (window.dataManager && typeof window.dataManager.saveData === 'function') {
                await window.dataManager.saveData(); // Re-saves, potentially compacting
                messages.push("主数据已重新保存。");
            }
            if (window.progressManager && typeof window.progressManager.saveUserProgress === 'function') {
                await window.progressManager.saveUserProgress(); // Re-saves progress
                messages.push("用户进度已重新保存。");
            }

            let emergencyCleaned = false;
            Object.keys(localStorage).forEach(key => {
                if (key.includes('_emergency_backup') || key.startsWith('quizData_emergency_')) { // More specific emergency backup keys
                    localStorage.removeItem(key);
                    emergencyCleaned = true;
                }
            });
            if (emergencyCleaned) {
                messages.push("localStorage中的紧急备份数据已清理。");
            }
            
            if (messages.length === 0) {
                alert('没有可执行的清理操作，或存储管理器不支持。');
            } else {
                alert('存储清理操作完成！\n\n' + messages.join('\n'));
            }
            await this.checkStorageStatus(); // 重新检查状态
            this.displayBackupList(); // MODIFIED: Refresh backup list
        } catch (error) {
            console.error('清理存储失败:', error);
            alert('清理存储失败：' + error.message);
        }
    }

    /**
     * 导出完整数据
     */
    async exportAllData() {
        try {
            if (window.storageManager && typeof window.storageManager.exportAllData === 'function') {
                await window.storageManager.exportAllData();
                alert('完整数据已导出为文件！');
            } else {
                // Fallback method: use the existing backupData which includes its own fallback
                console.warn("StorageManager.exportAllData not available, falling back to regular backup procedure.");
                await this.backupData(); // This will also call checkStorageStatus
            }
        } catch (error) {
            console.error('导出完整数据失败:', error);
            alert('导出失败：' + error.message);
        }
    }

    // MODIFIED: Added new methods for backup list display and deletion
    /**
     * 显示备份列表
     */
    async displayBackupList() {
        if (!this.adminBackupListContainer || !window.storageManager || typeof window.storageManager.getBackupList !== 'function') {
            if (this.adminBackupListContainer) {
                this.adminBackupListContainer.innerHTML = '<p style="padding: 10px; text-align: center; color: var(--text-muted);">备份功能不可用或存储管理器未初始化。</p>';
            }
            return;
        }

        try {
            const backups = await window.storageManager.getBackupList();
            if (backups.length === 0) {
                this.adminBackupListContainer.innerHTML = '<p style="padding: 10px; text-align: center; color: var(--text-muted);">暂无内部备份</p>';
                return;
            }

            let listHTML = '';
            backups.forEach(backup => {
                listHTML += `
                    <div class="backup-item">
                        <div class="backup-info">
                            <span class="backup-name">${backup.name || backup.id}</span>
                            <span class="backup-meta">
                                ${new Date(backup.timestamp).toLocaleString()} - ${backup.size || '未知大小'}
                            </span>
                        </div>
                        <div class="backup-actions">
                            <button class="backup-delete" onclick="window.adminManager.deleteSpecificBackup('${backup.id}')" title="删除此备份">
                                删除
                            </button>
                        </div>
                    </div>
                `;
            });
            this.adminBackupListContainer.innerHTML = listHTML;
        } catch (error) {
            console.error('获取备份列表失败:', error);
            this.adminBackupListContainer.innerHTML = `<p style="padding: 10px; text-align: center; color: var(--text-error, red);">获取备份列表失败: ${error.message}</p>`;
        }
    }

    /**
     * 删除指定的内部备份
     */
    async deleteSpecificBackup(backupId) {
        if (!confirm(`确定要删除备份 "${backupId}" 吗？此操作不可恢复。`)) return;

        try {
            if (!window.storageManager || typeof window.storageManager.removeItem !== 'function') {
                throw new Error('存储管理器不可用或功能不全。');
            }
            const success = await window.storageManager.removeItem(window.storageManager.stores.backup, backupId);
            if (success) {
                alert(`备份 "${backupId}" 已成功删除。`);
                this.displayBackupList(); // Refresh the list
                await this.checkStorageStatus(); // Update storage info
            } else {
                throw new Error('存储管理器未能删除备份。');
            }
        } catch (error) {
            console.error(`删除备份 "${backupId}" 失败:`, error);
            alert(`删除备份失败: ${error.message}`);
        }
    }
}

// 创建全局管理面板实例
window.adminManager = new AdminManager();

// ✅ FIX: Alias fillPeriodOptions to fillAIPeriodOptions for app.js compatibility
if (window.adminManager && typeof window.adminManager.fillPeriodOptions === 'function') {
    window.adminManager.fillAIPeriodOptions = function(...args) {
        const firstRow = this.multiPromptRows ? this.multiPromptRows.querySelector('.prompt-row') : null;
        if (firstRow) {
            const subjSel = firstRow.querySelector('.subject-select');
            const periodSel = firstRow.querySelector('.period-select');
            if (subjSel && periodSel) {
                // Assuming app.js called this without args, intending to refresh the first row or a general AI period select.
                // If args are passed, they are ignored here, which might be an issue if app.js relied on them.
                // For now, we refresh the first row's period options based on its current subject.
                this.fillPeriodOptions(subjSel.value, periodSel);
            }
        } else {
            // console.warn("fillAIPeriodOptions (alias): No AI prompt rows found to update.");
        }
    }.bind(window.adminManager); 
}