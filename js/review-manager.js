// --- START OF FILE review-manager.js (MODIFIED FOR STAGE 2) ---

/**
 * 学习助手应用 - 错题回顾管理模块
 * 负责错题的显示、筛选、复习、管理等功能
 */

class ReviewManager {
    constructor() {
        this.currentIncorrectQuestions = [];
        this.currentQuestionIndex = 0;
        this.reviewMode = 'practice'; // 'practice' 或 'view'
        this.currentUserAnswersInReview = [];
        this.filters = {
            subjectId: '',
            periodId: '',
            isMarked: null,
            masteryLevel: null,
            sortBy: 'addedDate' // 'addedDate', 'reviewCount', 'masteryLevel'
        };

        this.initElements();
        this.setupEventListeners();
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        // 错题回顾容器
        this.reviewContainer = document.getElementById('reviewContainer');
        this.reviewHeader = this.reviewContainer?.querySelector('.review-header');
        this.reviewContent = this.reviewContainer?.querySelector('.review-content');
        this.reviewControls = this.reviewContainer?.querySelector('.review-controls');

        // 错题列表相关
        this.incorrectQuestionsList = document.getElementById('incorrectQuestionsList');
        this.filtersPanel = document.getElementById('reviewFiltersPanel');
        this.subjectFilter = document.getElementById('reviewSubjectFilter');
        this.periodFilter = document.getElementById('reviewPeriodFilter');
        this.markedFilter = document.getElementById('reviewMarkedFilter');
        this.masteryFilter = document.getElementById('reviewMasteryFilter');
        this.sortBySelect = document.getElementById('reviewSortBy');

        // 按钮控件
        this.startReviewBtn = document.getElementById('startReviewBtn');
        this.viewModeBtn = document.getElementById('viewModeBtn');
        this.practiceModeBtn = document.getElementById('practiceModeBtn');
        this.clearFiltersBtn = document.getElementById('clearReviewFilters');
        this.reviewCloseBtn = document.getElementById('reviewCloseBtn');
        this.reviewPrevBtn = document.getElementById('reviewPrevBtn');
        this.reviewNextBtn = document.getElementById('reviewNextBtn');
        this.reviewSubmitBtn = document.getElementById('reviewSubmitBtn');

        // 统计显示
        this.incorrectQuestionsCount = document.getElementById('incorrectQuestionsCount');
        this.reviewProgressBar = document.getElementById('reviewProgressBar');
        this.reviewQuestionArea = document.getElementById('reviewQuestionArea');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 筛选器事件
        if (this.subjectFilter) {
            this.subjectFilter.addEventListener('change', () => this.handleFilterChange());
        }
        if (this.periodFilter) {
            this.periodFilter.addEventListener('change', () => this.handleFilterChange());
        }
        if (this.markedFilter) {
            this.markedFilter.addEventListener('change', () => this.handleFilterChange());
        }
        if (this.masteryFilter) {
            this.masteryFilter.addEventListener('change', () => this.handleFilterChange());
        }
        if (this.sortBySelect) {
            this.sortBySelect.addEventListener('change', () => this.handleFilterChange());
        }

        // 按钮事件
        if (this.startReviewBtn) {
            this.startReviewBtn.addEventListener('click', () => this.startReview('practice'));
        }
        if (this.viewModeBtn) {
            this.viewModeBtn.addEventListener('click', () => this.startReview('view'));
        }
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        if (this.reviewCloseBtn) {
            this.reviewCloseBtn.addEventListener('click', () => this.closeReview());
        }
        if (this.reviewPrevBtn) {
            this.reviewPrevBtn.addEventListener('click', () => this.handlePrevious());
        }
        if (this.reviewNextBtn) {
            this.reviewNextBtn.addEventListener('click', () => this.handleNext());
        }
        if (this.reviewSubmitBtn) {
            this.reviewSubmitBtn.addEventListener('click', () => this.handleSubmit());
        }

        const exportIncorrectBtn = document.getElementById('exportIncorrectBtn');
        if (exportIncorrectBtn) {
            exportIncorrectBtn.addEventListener('click', () => this.exportIncorrectQuestions());
        }

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
        if (this.reviewContainer && this.reviewContainer.style.display !== 'none' && this.reviewQuestionArea && this.reviewQuestionArea.offsetParent !== null) { // Check if review modal is active
            switch (e.key) {
                case 'Escape':
                    this.closeReview();
                    break;
                case 'ArrowLeft':
                    if (this.reviewPrevBtn && !this.reviewPrevBtn.disabled) {
                        e.preventDefault();
                        this.handlePrevious();
                    }
                    break;
                case 'ArrowRight':
                    if (this.reviewNextBtn && !this.reviewNextBtn.disabled) {
                        e.preventDefault();
                        this.handleNext();
                    }
                    break;
                case 'Enter':
                     if (this.reviewMode === 'practice' && this.reviewSubmitBtn && this.reviewSubmitBtn.style.display !== 'none' && !this.reviewSubmitBtn.disabled) {
                        e.preventDefault();
                        this.handleSubmit();
                    }
                    break;
            }
        }
    }

    initReviewPage() {
        this.loadFilters();
        this.loadIncorrectQuestions();
        this.updateStatistics();
    }

    loadFilters() {
        if (!window.dataManager) return;
        if (this.subjectFilter) {
            const allQuizData = window.dataManager.getData();
            this.subjectFilter.innerHTML = '<option value="">所有学科</option>';
            Object.values(allQuizData).forEach(subject => {
                if (subject && subject.id && subject.name) {
                    const option = document.createElement('option');
                    option.value = subject.id;
                    option.textContent = subject.name;
                    this.subjectFilter.appendChild(option);
                }
            });
        }
        this.updatePeriodFilter();
    }

    updatePeriodFilter() {
        if (!this.periodFilter || !window.dataManager) return;
        this.periodFilter.innerHTML = '<option value="">所有分类</option>';
        if (this.filters.subjectId) {
            const options = window.dataManager.getPeriodOptions(this.filters.subjectId);
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.name;
                this.periodFilter.appendChild(optionElement);
            });
        }
    }

    handleFilterChange() {
        this.filters.subjectId = this.subjectFilter?.value || '';
        this.filters.periodId = this.periodFilter?.value || '';
        this.filters.isMarked = this.markedFilter?.value === 'true' ? true :
                               this.markedFilter?.value === 'false' ? false : null;
        const masteryValue = this.masteryFilter?.value;
        this.filters.masteryLevel = masteryValue && masteryValue !== '' ? parseInt(masteryValue) : null;

        this.filters.sortBy = this.sortBySelect?.value || 'addedDate';

        if (this.subjectFilter && this.subjectFilter.value !== this.previousSubjectFilterValue) {
            this.updatePeriodFilter();
        }
        this.previousSubjectFilterValue = this.subjectFilter?.value;


        this.loadIncorrectQuestions();
        this.updateStatistics();
    }

    clearFilters() {
        this.filters = {
            subjectId: '',
            periodId: '',
            isMarked: null,
            masteryLevel: null,
            sortBy: 'addedDate'
        };
        if (this.subjectFilter) this.subjectFilter.value = '';
        if (this.periodFilter) this.periodFilter.value = '';
        if (this.markedFilter) this.markedFilter.value = '';
        if (this.masteryFilter) this.masteryFilter.value = '';
        if (this.sortBySelect) this.sortBySelect.value = 'addedDate';
        this.updatePeriodFilter();
        this.loadIncorrectQuestions();
        this.updateStatistics();
    }

    loadIncorrectQuestions() {
        if (!window.progressManager || !window.progressManager.isInitialized()) {
            this.currentIncorrectQuestions = [];
            this.displayIncorrectQuestions();
            return;
        }
        this.currentIncorrectQuestions = window.progressManager.getIncorrectQuestions(this.filters);
        this.sortIncorrectQuestions();
        this.displayIncorrectQuestions();
    }

    sortIncorrectQuestions() {
        const sortBy = this.filters.sortBy;
        this.currentIncorrectQuestions.sort((a, b) => {
            switch (sortBy) {
                case 'addedDate': return new Date(b.addedDate) - new Date(a.addedDate);
                case 'reviewCount': return (a.reviewCount || 0) - (b.reviewCount || 0);
                case 'masteryLevel': return (a.masteryLevel || 0) - (b.masteryLevel || 0);
                default: return new Date(b.addedDate) - new Date(a.addedDate);
            }
        });
    }

    displayIncorrectQuestions() {
        if (!this.incorrectQuestionsList) return;
        if (this.currentIncorrectQuestions.length === 0) {
            this.incorrectQuestionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <h3>暂无符合条件的错题</h3>
                    <p>调整筛选条件或继续学习以收录更多错题。</p>
                </div>`;
            return;
        }
        this.incorrectQuestionsList.innerHTML = this.currentIncorrectQuestions.map((question, index) =>
            this.createIncorrectQuestionCard(question, index)
        ).join('');
    }

    createIncorrectQuestionCard(question, index) {
        const addedDate = new Date(question.addedDate).toLocaleDateString();
        const lastReview = question.lastReviewDate ? new Date(question.lastReviewDate).toLocaleDateString() : '未复习';
        const masteryStars = '★'.repeat(question.masteryLevel || 0) + '☆'.repeat(5 - (question.masteryLevel || 0));
        const isMulti = Array.isArray(question.correctAnswer);
        const correctAnswers = isMulti ? question.correctAnswer : [question.correctAnswer];
        const userAnswers = Array.isArray(question.userAnswer) ? question.userAnswer : (question.userAnswer !== null ? [question.userAnswer] : []);

        return `
            <div class="incorrect-question-card" data-question-id="${question.id}">
                <div class="question-card-header">
                    <div class="question-meta">
                        <span class="question-source">${question.quizName}</span>
                        <span class="question-section">${question.section || '综合'} (${isMulti ? '多选' : '单选'})</span>
                    </div>
                    <div class="question-actions">
                        <button class="mark-btn ${question.isMarked ? 'marked' : ''}"
                                onclick="window.reviewManager.toggleQuestionMark('${question.id}')"
                                title="${question.isMarked ? '取消标记' : '标记重点'}">
                            ${question.isMarked ? '🏷️' : '🔖'}
                        </button>
                        <button class="remove-btn"
                                onclick="window.reviewManager.removeQuestion('${question.id}')"
                                title="从错题本中移除">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="question-content">
                    <p class="question-text">${question.question}</p>
                    <div class="question-options">
                        ${question.options.map((option, i) => {
                            let optClass = '';
                            if (correctAnswers.includes(i)) optClass += ' correct';
                            if (userAnswers.includes(i)) {
                                optClass += correctAnswers.includes(i) ? '' : ' user-choice';
                            }
                            return `
                            <div class="option${optClass}">
                                <span class="option-label">${String.fromCharCode(65 + i)}.</span>
                                <span class="option-text">${option}</span>
                                ${correctAnswers.includes(i) ? '<span class="correct-mark">✓</span>' : ''}
                                ${userAnswers.includes(i) && !correctAnswers.includes(i) ? '<span class="wrong-mark">✗</span>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                    ${question.explanation ? `<div class="question-explanation"><strong>解析：</strong>${question.explanation}</div>` : ''}
                    <!-- NEW: AI action buttons for review questions -->
                    <div class="ai-action-btn-container" style="text-align: right; margin-top: 15px;">
                        <button class="action-btn secondary ai-quiz-action-btn"
                                onclick="window.reviewManager.activateAIHintForReview('${question.id}')"
                                title="获取AI对这道题的提示">💡 AI提示</button>
                        <button class="action-btn primary ai-quiz-action-btn"
                                onclick="window.reviewManager.activateAIExplainForReview('${question.id}')"
                                title="获取AI对这道题的详细解析">📝 AI解析</button>
                    </div>
                </div>
                <div class="question-card-footer">
                    <div class="question-stats">
                        <span class="mastery-level" title="掌握程度">掌握度: ${masteryStars}</span>
                        <span class="review-count">复习 ${question.reviewCount || 0} 次</span>
                        <span class="added-date">收录: ${addedDate}</span>
                        <span class="last-review">最近: ${lastReview}</span>
                    </div>
                </div>
            </div>`;
    }

    // NEW: Activate AI Hint for a question in review mode
    activateAIHintForReview(questionId) {
        if (!window.uiManager || typeof window.uiManager.activateAIChatMode !== 'function') {
            console.warn("UIManager or activateAIChatMode not available for AI Hint in review.");
            return;
        }
        const questionData = this.currentIncorrectQuestions.find(q => q.id === questionId);
        if (questionData) {
            window.uiManager.activateAIChatMode('hint', questionData);
        } else {
            window.uiManager.showToast("未能找到该题目数据以获取AI提示。", "error");
        }
    }

    // NEW: Activate AI Explain for a question in review mode
    activateAIExplainForReview(questionId) {
        if (!window.uiManager || typeof window.uiManager.activateAIChatMode !== 'function') {
            console.warn("UIManager or activateAIChatMode not available for AI Explain in review.");
            return;
        }
        const questionData = this.currentIncorrectQuestions.find(q => q.id === questionId);
        if (questionData) {
            // For explanation, we can use the historical user answer if available
            // Note: In review mode, userAnswer is the *original* incorrect answer.
            // isCorrect is *false* by definition since it's an incorrect question.
            const dataForAI = {
                ...questionData,
                userAnswer: questionData.userAnswer, // Original user answer
                isCorrect: false // Always false for incorrect questions
            };
            window.uiManager.activateAIChatMode('explain', dataForAI);
        } else {
            window.uiManager.showToast("未能找到该题目数据以获取AI解析。", "error");
        }
    }


    updateStatistics() {
        if (!this.incorrectQuestionsCount) return;
        const total = this.currentIncorrectQuestions.length;
        const marked = this.currentIncorrectQuestions.filter(q => q.isMarked).length;
        const needReview = this.currentIncorrectQuestions.filter(q => (q.masteryLevel || 0) < 3).length;
        this.incorrectQuestionsCount.innerHTML = `
            <div class="stats-summary">
                <div class="stat-item"><span class="stat-value">${total}</span><span class="stat-label">错题总数</span></div>
                <div class="stat-item"><span class="stat-value">${marked}</span><span class="stat-label">已标记</span></div>
                <div class="stat-item"><span class="stat-value">${needReview}</span><span class="stat-label">需复习</span></div>
            </div>`;
    }

    startReview(mode = 'practice') {
        if (this.currentIncorrectQuestions.length === 0) {
            alert('没有错题可以复习！');
            return;
        }
        this.reviewMode = mode;
        this.currentQuestionIndex = 0;
        this.currentUserAnswersInReview = this.currentIncorrectQuestions.map(q => Array.isArray(q.correctAnswer) ? [] : null);

        this.showReviewContainer();
        this.displayReviewQuestion();
    }

    showReviewContainer() {
        if (this.reviewContainer) {
            this.reviewContainer.style.display = 'block';
            // Now managed by _updateBodyOverflow in ui-manager
            // document.body.style.overflow = 'hidden';
            // document.body.classList.add('modal-open');
            window.uiManager._updateBodyOverflow(); // Ensure modal-open is set
        }
    }

    closeReview() {
        if (this.reviewContainer) {
            this.reviewContainer.style.display = 'none';
            // Now managed by _updateBodyOverflow in ui-manager
            // document.body.style.overflow = 'auto';
            // document.body.classList.remove('modal-open');
            window.uiManager._updateBodyOverflow(); // Ensure modal-open is cleared if no other modals are open
        }
        this.loadIncorrectQuestions();
        this.updateStatistics();
    }

    displayReviewQuestion() {
        if (!this.reviewQuestionArea || this.currentQuestionIndex >= this.currentIncorrectQuestions.length) {
            if(this.currentIncorrectQuestions.length > 0) this.completeReview();
            else this.closeReview();
            return;
        }
        const question = this.currentIncorrectQuestions[this.currentQuestionIndex];
        this.updateReviewProgress();
        this.reviewQuestionArea.innerHTML = this.createReviewQuestionHTML(question);
        this.updateReviewControls(question);
        this.setupReviewOptionListeners(question);
    }

    setupReviewOptionListeners(questionData) {
        if (this.reviewMode !== 'practice') return;

        const options = this.reviewQuestionArea.querySelectorAll('input[name="reviewQuestion"]');
        const isMulti = Array.isArray(questionData.correctAnswer);

        options.forEach(input => {
            input.addEventListener('change', () => {
                const optionIndex = parseInt(input.value);
                let currentSelection = this.currentUserAnswersInReview[this.currentQuestionIndex];

                if (isMulti) {
                    if (!Array.isArray(currentSelection)) currentSelection = [];
                    if (input.checked) {
                        if (!currentSelection.includes(optionIndex)) {
                            currentSelection.push(optionIndex);
                        }
                    } else {
                        const idxToRemove = currentSelection.indexOf(optionIndex);
                        if (idxToRemove > -1) {
                            currentSelection.splice(idxToRemove, 1);
                        }
                    }
                    this.currentUserAnswersInReview[this.currentQuestionIndex] = [...currentSelection];
                } else {
                    this.currentUserAnswersInReview[this.currentQuestionIndex] = optionIndex;
                }
                this.reviewSubmitBtn.disabled = false;
                input.closest('label').classList.toggle('selected-option', input.checked);
                if(!isMulti && input.checked) {
                    options.forEach(otherInput => {
                        if(otherInput !== input) otherInput.closest('label').classList.remove('selected-option');
                    });
                }
            });
        });
    }

    createReviewQuestionHTML(question) {
        const isViewMode = this.reviewMode === 'view';
        const isMulti = Array.isArray(question.correctAnswer);
        const inputType = isMulti ? 'checkbox' : 'radio';
        const historicalCorrectAnswers = isMulti ? question.correctAnswer : [question.correctAnswer];
        const historicalUserAnswers = Array.isArray(question.userAnswer) ? question.userAnswer : (question.userAnswer !== null ? [question.userAnswer] : []);
        const currentSessionAnswer = this.currentUserAnswersInReview[this.currentQuestionIndex];

        return `
            <div class="review-question-block">
                <div class="review-question-header">
                    <div class="question-source-info">
                        <span class="quiz-name">${question.quizName}</span>
                        <span class="question-section">${question.section || '综合'} (${isMulti ? '多选' : '单选'})</span>
                    </div>
                    <div class="question-mastery">
                        掌握度: ${'★'.repeat(question.masteryLevel || 0)}${'☆'.repeat(5 - (question.masteryLevel || 0))}
                    </div>
                </div>
                <div class="review-question-content">
                    <p class="question-text">${question.question}</p>
                    <div class="review-options">
                        ${question.options.map((option, i) => {
                            let labelClasses = "review-option";
                            let inputChecked = false;
                            if (isViewMode) {
                                labelClasses += " view-mode";
                                if (historicalCorrectAnswers.includes(i)) labelClasses += ' correct-highlight';
                                if (historicalUserAnswers.includes(i) && !historicalCorrectAnswers.includes(i)) labelClasses += ' incorrect-highlight';
                            } else {
                                if (isMulti && Array.isArray(currentSessionAnswer) && currentSessionAnswer.includes(i)) {
                                    inputChecked = true;
                                    labelClasses += ' selected-option';
                                } else if (!isMulti && currentSessionAnswer === i) {
                                    inputChecked = true;
                                     labelClasses += ' selected-option';
                                }
                            }

                            return `
                            <label class="${labelClasses}">
                                <input type="${inputType}"
                                       name="reviewQuestion"
                                       value="${i}"
                                       ${isViewMode ? 'disabled' : ''}
                                       ${inputChecked ? 'checked' : ''}
                                       data-question-id="${question.id}">
                                <span class="${isMulti ? 'custom-checkbox' : 'custom-radio'}"></span>
                                <span class="option-text">${String.fromCharCode(65 + i)}. ${option}</span>
                                ${isViewMode && historicalCorrectAnswers.includes(i) ? '<span class="correct-mark">✓</span>' : ''}
                                ${isViewMode && historicalUserAnswers.includes(i) && !historicalCorrectAnswers.includes(i) ? '<span class="wrong-mark">✗</span>' : ''}
                            </label>`;
                        }).join('')}
                    </div>
                    ${isViewMode && question.explanation ? `<div class="review-explanation"><h4>解析</h4><p>${question.explanation}</p></div>` : ''}
                    ${isViewMode ? `
                        <div class="review-history">
                            <p><strong>您上次的选择：</strong>${historicalUserAnswers.map(ua => question.options[ua]).join('、 ') || '未选择'}</p>
                            <p><strong>正确答案：</strong>${historicalCorrectAnswers.map(ca => question.options[ca]).join('、 ')}</p>
                            <p><strong>复习次数：</strong>${question.reviewCount || 0}</p>
                            <p><strong>收录时间：</strong>${new Date(question.addedDate).toLocaleString()}</p>
                        </div>` : ''}
                    <!-- NEW: AI action buttons for review questions (only in view mode) -->
                    ${isViewMode ? `
                    <div class="ai-action-btn-container">
                        <button class="action-btn secondary ai-quiz-action-btn"
                                onclick="window.reviewManager.activateAIHintForReview('${question.id}')"
                                title="获取AI对这道题的提示">💡 AI提示</button>
                        <button class="action-btn primary ai-quiz-action-btn"
                                onclick="window.reviewManager.activateAIExplainForReview('${question.id}')"
                                title="获取AI对这道题的详细解析">📝 AI解析</button>
                    </div>
                    ` : ''}
                </div>
            </div>`;
    }

    updateReviewProgress() {
        if (this.reviewProgressBar) {
            const progress = ((this.currentQuestionIndex + 1) / this.currentIncorrectQuestions.length) * 100;
            this.reviewProgressBar.style.width = `${progress}%`;
            this.reviewProgressBar.textContent = `${this.currentQuestionIndex + 1} / ${this.currentIncorrectQuestions.length}`;
        }
    }

    updateReviewControls(currentQuestionData) {
        if (this.reviewPrevBtn) {
            this.reviewPrevBtn.disabled = false;
        }

        const isLast = this.currentQuestionIndex === this.currentIncorrectQuestions.length - 1;
        if (this.reviewNextBtn) {
            this.reviewNextBtn.textContent = isLast ? '完成复习' : '下一题';
            this.reviewNextBtn.disabled = false;
        }

        if (this.reviewSubmitBtn) {
            const isAnsweredInPractice = this.reviewQuestionArea.querySelector('.review-result') !== null;
            this.reviewSubmitBtn.style.display = (this.reviewMode === 'practice' && !isAnsweredInPractice) ? 'inline-flex' : 'none';
            this.reviewSubmitBtn.disabled = false;
        }
    }

    handlePrevious() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayReviewQuestion();
        }
    }

    handleNext() {
        const isAnsweredInPractice = this.reviewQuestionArea.querySelector('.review-result') !== null;
        if (isAnsweredInPractice || this.reviewMode === 'view' || this.currentQuestionIndex === this.currentIncorrectQuestions.length - 1) {
            if (this.currentQuestionIndex < this.currentIncorrectQuestions.length - 1) {
                this.currentQuestionIndex++;
                this.displayReviewQuestion();
            } else {
                this.completeReview();
            }
        } else {
             alert("请先提交当前题目答案。");
        }
    }

    handleSubmit() {
        if (this.reviewMode !== 'practice') return;

        const question = this.currentIncorrectQuestions[this.currentQuestionIndex];
        const isMulti = Array.isArray(question.correctAnswer);
        let userAnswerIndices;

        if (isMulti) {
            userAnswerIndices = Array.from(this.reviewQuestionArea.querySelectorAll('input[name="reviewQuestion"]:checked'))
                                   .map(input => parseInt(input.value));
            if (userAnswerIndices.length === 0) {
                alert('请至少选择一个答案！');
                return;
            }
        } else {
            const selectedOptionInput = this.reviewQuestionArea.querySelector('input[name="reviewQuestion"]:checked');
            if (!selectedOptionInput) {
                alert('请选择一个答案！');
                return;
            }
            userAnswerIndices = parseInt(selectedOptionInput.value);
        }

        this.currentUserAnswersInReview[this.currentQuestionIndex] = userAnswerIndices;

        let isCorrect;
        if (isMulti) {
            const sortedUserAnswers = [...userAnswerIndices].sort((a, b) => a - b);
            const sortedCorrectAnswers = [...question.correctAnswer].sort((a, b) => a - b);
            isCorrect = sortedUserAnswers.length === sortedCorrectAnswers.length &&
                        sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx]);
        } else {
            isCorrect = userAnswerIndices === question.correctAnswer;
        }

        if (window.progressManager) {
            window.progressManager.updateIncorrectQuestionMastery(question.id, isCorrect);
        }

        this.showSubmitResult(question, userAnswerIndices, isCorrect);

        const optionsInputs = this.reviewQuestionArea.querySelectorAll('input[name="reviewQuestion"]');
        optionsInputs.forEach(input => input.disabled = true);

        if (this.reviewSubmitBtn) this.reviewSubmitBtn.style.display = 'none';
        if (this.reviewNextBtn) this.reviewNextBtn.disabled = false;
    }

    showSubmitResult(question, userAnswer, isCorrect) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `review-result ${isCorrect ? 'correct' : 'incorrect'}`;
        const isMulti = Array.isArray(question.correctAnswer);

        let userAnswerText;
        if (isMulti) {
            userAnswerText = Array.isArray(userAnswer) && userAnswer.length > 0
                ? userAnswer.map(i => question.options[i]).join('、 ')
                : '未选择';
        } else {
            userAnswerText = userAnswer !== null ? question.options[userAnswer] : '未选择';
        }

        const correctAnswerText = (isMulti ? question.correctAnswer : [question.correctAnswer])
            .map(i => question.options[i]).join('、 ');

        resultDiv.innerHTML = `
            <div class="result-header">
                <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                <span class="result-text">${isCorrect ? '回答正确！' : '回答错误'}</span>
            </div>
            ${!isCorrect ? `
                <div class="result-details">
                    <p><strong>您的选择：</strong>${userAnswerText}</p>
                    <p><strong>正确答案：</strong>${correctAnswerText}</p>
                </div>
            ` : ''}
            ${question.explanation ? `
                <div class="result-explanation">
                    <h4>解析</h4>
                    <p>${question.explanation}</p>
                </div>
            ` : ''}
        `;

        const optionsDiv = this.reviewQuestionArea.querySelector('.review-options');
        if (optionsDiv) {
            this.highlightReviewedOptions(optionsDiv, question, userAnswer);
        }

        this.reviewQuestionArea.appendChild(resultDiv);
        if (this.reviewNextBtn) this.reviewNextBtn.disabled = false;

    }

    highlightReviewedOptions(optionsDiv, questionData, userAnswer) {
        const labels = optionsDiv.querySelectorAll('label');
        const isMulti = Array.isArray(questionData.correctAnswer);
        const correctAnswers = isMulti ? questionData.correctAnswer : [questionData.correctAnswer];
        const userAnswersArray = isMulti ? (Array.isArray(userAnswer) ? userAnswer : []) : (userAnswer !== null ? [userAnswer] : []);

        labels.forEach((label, i) => {
            label.classList.remove('selected-option');
            const isCorrectOption = correctAnswers.includes(i);
            const isUserSelectedOption = userAnswersArray.includes(i);

            if (isCorrectOption) {
                label.classList.add('correct-highlight');
                if (!isUserSelectedOption && isMulti) {
                     label.classList.add('missed-correct-highlight');
                }
            } else if (isUserSelectedOption) {
                label.classList.add('incorrect-highlight');
            }
        });
    }

    async completeReview() {
        const reviewedCount = this.currentIncorrectQuestions.length;
        const attemptedCount = this.currentUserAnswersInReview.filter(ans =>
            (Array.isArray(ans) && ans.length > 0) || (ans !== null && !Array.isArray(ans))
        ).length;

        let message = `恭喜完成错题复习！\n\n本次共浏览/练习了 ${this.currentQuestionIndex + 1} 道错题。`;
        if(this.reviewMode === 'practice' && attemptedCount < (this.currentQuestionIndex + 1) && (this.currentQuestionIndex +1) === reviewedCount){
            message += `\n(部分题目未作答，建议完整练习所有题目哦！)`;
        }
        message += `\n继续加油！🎉`;

        alert(message);

        if (this.reviewMode === 'practice' && window.progressManager && typeof window.progressManager.recordReviewPracticeCompletion === 'function') {
            try {
                await window.progressManager.recordReviewPracticeCompletion();
            } catch (e) {
                console.error("Error recording review practice completion:", e);
            }
        }
        this.closeReview();
    }

    toggleQuestionMark(questionId) {
        if (window.progressManager) {
            const newMarkState = window.progressManager.toggleIncorrectQuestionMark(questionId);
            const markBtn = document.querySelector(`.incorrect-question-card[data-question-id="${questionId}"] .mark-btn`);
            if (markBtn) {
                markBtn.innerHTML = newMarkState ? '🏷️' : '🔖';
                markBtn.classList.toggle('marked', newMarkState);
                markBtn.title = newMarkState ? '取消标记' : '标记重点';
            }
            this.updateStatistics();
        }
    }

    removeQuestion(questionId) {
        if (confirm('确定要从错题本中移除这道题吗？')) {
            if (window.progressManager && window.progressManager.removeIncorrectQuestion(questionId)) {
                this.loadIncorrectQuestions();
                this.updateStatistics();
                if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast('题目已从错题本中移除', 'success');
                } else {
                    this.showMessage('题目已从错题本中移除', 'success');
                }
            }
        }
    }

    showMessage(message, type = 'info') { // This is now a fallback if uiManager is not available
         console.warn("ReviewManager: Calling deprecated showMessage. UIManager.showToast should be used.");
         const messageDivId = 'reviewToastMessage';
         let toast = document.getElementById(messageDivId);
         if (!toast) {
             toast = document.createElement('div');
             toast.id = messageDivId;
             Object.assign(toast.style, {
                 position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                 padding: '12px 20px', borderRadius: '8px', color: 'white', fontSize: '0.9rem',
                 zIndex: '10001', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', opacity: '0',
                 transition: 'opacity 0.3s ease, bottom 0.3s ease'
             });
             document.body.appendChild(toast);
         }
         toast.textContent = message;
         toast.style.backgroundColor = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)'; // Added warning type
         if (toast.currentTimeout) clearTimeout(toast.currentTimeout);
         setTimeout(() => { toast.style.opacity = '1'; toast.style.bottom = '30px'; }, 10);
         toast.currentTimeout = setTimeout(() => { toast.style.opacity = '0'; toast.style.bottom = '20px'; }, 3000);
     }


    batchMarkQuestions(questionIds, markState) {
        console.warn("Batch mark functionality not fully implemented in UI yet.");
    }

    batchRemoveQuestions(questionIds) {
        console.warn("Batch remove functionality not fully implemented in UI yet.");
        if (confirm(`确定要移除选中的 ${questionIds.length} 道错题吗？`)) {
            if (window.progressManager) {
                questionIds.forEach(id => {
                    window.progressManager.removeIncorrectQuestion(id);
                });
                this.loadIncorrectQuestions();
                this.updateStatistics();
                if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast(`已移除 ${questionIds.length} 道错题`, 'success');
                } else {
                    this.showMessage(`已移除 ${questionIds.length} 道错题`, 'success');
                }
            }
        }
    }

    exportIncorrectQuestions() {
        if (this.currentIncorrectQuestions.length === 0) {
            if (window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast('没有错题可以导出。', 'info');
            } else {
                this.showMessage('没有错题可以导出。', 'info');
            }
            return;
        }
        const exportData = {
            exportTime: new Date().toISOString(),
            questions: this.currentIncorrectQuestions,
            filters: this.filters
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incorrect_questions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('错题数据已导出', 'success');
        } else {
            this.showMessage('错题数据已导出', 'success');
        }
    }

    getIncorrectQuestionsStats() {
        if (!window.progressManager) return {};
        const allIncorrect = window.progressManager.getIncorrectQuestions();
        return {
            total: allIncorrect.length,
            bySubject: this.groupBy(allIncorrect, 'subjectId'),
            byMastery: this.groupBy(allIncorrect, 'masteryLevel'),
            marked: allIncorrect.filter(q => q.isMarked).length,
            needReview: allIncorrect.filter(q => (q.masteryLevel || 0) < 3).length
        };
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'unknown';
            result[group] = result[group] || [];
            result[group].push(item);
            return result;
        }, {});
    }
}

window.reviewManager = new ReviewManager();
// --- END OF FILE review-manager.js (MODIFIED FOR STAGE 2) ---