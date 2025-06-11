// js/achievement-definitions.js

// 确保 AppConfig 对象存在
window.AppConfig = window.AppConfig || {};

window.AppConfig.ACHIEVEMENT_DEFINITIONS = [
    // 基础与入门
    {
        id: 'first_quiz',
        name: '初学乍练',
        description: '完成您的第一个测验，迈出学习的第一步！',
        icon: '🎯',
        type: 'flag',
        statKey: 'totalQuizzes',
        target: 1
    },
    {
        id: 'daily_first_try',
        name: '每日打卡初体验',
        description: '首次完成"每日一测"。',
        icon: '📅',
        type: 'flag',
        statKey: 'firstDailyQuizDone',
        target: true
    },
    {
        id: 'review_first_time',
        name: '温故知新',
        description: '首次使用错题回顾功能进行练习。',
        icon: '📝',
        type: 'flag',
        statKey: 'firstReviewPracticeDone',
        target: true
    },
    // 数量与积累
    { id: 'quiz_attempts_10', name: '练习生', description: '累计完成10次测验。', icon: '📚', target: 10, type: 'count' },
    { id: 'quiz_attempts_50', name: '进阶者', description: '累计完成50次测验。', icon: '🧑‍🎓', target: 50, type: 'count' },
    { id: 'quiz_attempts_100', name: '资深学徒', description: '累计完成100次测验。', icon: '🎓', target: 100, type: 'count' },
    { id: 'question_answered_100', name: '百题先锋', description: '累计回答100道题目。', icon: '💯', target: 100, type: 'count' },
    { id: 'question_answered_500', name: '题海领航员', description: '累计回答500道题目。', icon: '👑', target: 500, type: 'count' },
    { id: 'question_answered_1000', name: '千题大师', description: '累计回答1000道题目。', icon: '🌟', target: 1000, type: 'count' },
    { id: 'completed_unique_quizzes_5', name: '初窥门径', description: '完成5个不同的题库。', icon: '🗺️', target: 5, type: 'count' },
    { id: 'completed_unique_quizzes_20', name: '学有所成', description: '完成20个不同的题库。', icon: '🧭', target: 20, type: 'count' },
    { id: 'completed_unique_quizzes_50', name: '博览群书', description: '完成50个不同的题库。', icon: '🏛️', target: 50, type: 'count' },
    // 正确率与精通
    { id: 'accuracy_overall_80', name: '稳定输出', description: '整体正确率首次达到80%。', icon: '👍', target: 80, type: 'percentage' },
    { id: 'accuracy_overall_90', name: '精准打击', description: '整体正确率首次达到90%。', icon: '🎯', target: 90, type: 'percentage' },
    { id: 'accuracy_overall_95', name: '学霸光环', description: '整体正确率首次达到95%。', icon: '✨', target: 95, type: 'percentage' },
    { id: 'perfect_quiz_10_plus', name: '完美无瑕', description: '在一次包含至少10道题的测验中获得100%正确率。', icon: '🥇', target: 1, type: 'count' },
    { id: 'perfect_quiz_hard', name: '高分学神', description: '在一个"高级"难度的测验中获得100%正确率。', icon: '🏆', target: 1, type: 'count' },
    { id: 'no_mistakes_streak_3', name: '零失误精英', description: '连续3次测验无任何错题。', icon: '👌', target: 3, type: 'count' },
    // 持续性与毅力
    { id: 'streak_accuracy_80_5', name: '状态火热', description: '连续5次测验正确率均达到80%以上。', icon: '🔥', target: 5, type: 'count' },
    { id: 'streak_accuracy_80_10', name: '势不可挡', description: '连续10次测验正确率均达到80%以上。', icon: '⚡', target: 10, type: 'count' },
    { id: 'streak_accuracy_90_3', name: '学神附体', description: '连续3次测验正确率均达到90%以上。', icon: '🌠', target: 3, type: 'streak_complex' }, // Special type
    { id: 'study_days_7', name: '学习小蜜蜂', description: '累计学习7天。', icon: '🐝', target: 7, type: 'count' },
    { id: 'study_days_30', name: '持之以恒', description: '累计学习30天。', icon: '📅', target: 30, type: 'count' },
    { id: 'study_days_90', name: '季度毅行者', description: '累计学习90天。', icon: '🗓️', target: 90, type: 'count' },
    { id: 'study_days_180', name: '半年耕耘', description: '累计学习180天。', icon: '🧑‍🌾', target: 180, type: 'count' },
    { id: 'daily_quiz_streak_7', name: '每日一测常客', description: '连续7天完成"每日一测"。', icon: '☀️', target: 7, type: 'count' },
    { id: 'daily_quiz_streak_30', name: '每日一测铁粉', description: '连续30天完成"每日一测"。', icon: '🌟', target: 30, type: 'count' },
    // 学科与时期探索
    { id: 'subject_expert_western_art', name: '外国艺术史通', description: '外国艺术史完成5个不同题库且平均正确率75%+', icon: '🌍', target: 5, type: 'subject_expert', subjectId: 'western_art', accuracyTarget: 75 },
    { id: 'subject_expert_chinese_art', name: '中国美术史通', description: '中国美术史完成5个不同题库且平均正确率75%+', icon: '🖌️', target: 5, type: 'subject_expert', subjectId: 'chinese_art', accuracyTarget: 75 },
    { id: 'subject_expert_art_theory', name: '艺术理论家', description: '艺术概论完成3个不同题库且平均正确率75%+', icon: '🧐', target: 3, type: 'subject_expert', subjectId: 'art_theory', accuracyTarget: 75 },
    { id: 'subject_expert_politics', name: '时政小灵通', description: '考研政治完成5个不同题库且平均正确率70%+', icon: '🚩', target: 5, type: 'subject_expert', subjectId: 'postgraduate_politics', accuracyTarget: 70 },
    { id: 'subject_expert_knowledge', name: '百科爱好者', description: '世界常识完成5个不同题库且平均正确率70%+', icon: '🌍', target: 5, type: 'subject_expert', subjectId: 'world_knowledge', accuracyTarget: 70 },
    { id: 'subject_expert_english', name: '英语小达人', description: '英语选择题完成5个不同题库且平均正确率70%+', icon: '🔤', target: 5, type: 'subject_expert', subjectId: 'english_mcq', accuracyTarget: 70 },
    { id: 'renaissance_scholar', name: '文艺复兴学者', description: '完成3个外国艺术史中"文艺复兴"相关时期的题库。', icon: '⚜️', target: 3, type: 'period_count', periodKey: 'renaissance' },
    { id: 'impressionism_lover', name: '光影追随者', description: '完成2个"印象派"或"后印象派"的题库。', icon: '🌅', target: 2, type: 'period_count', periodKey: 'impressionism_related' },
    { id: 'ancient_china_explorer', name: '华夏探秘者', description: '完成3个中国美术史中古代时期（如唐代及以前）的题库。', icon: '🐉', target: 3, type: 'period_count', periodKey: 'ancient_china' },
    // 错题与复习
    { id: 'clear_incorrect_once', name: '错题清零', description: '错题本中的错题数量首次降至0。', icon: '✅', target: 1, type: 'flag_count_based', statKey: 'incorrectQuestionsClearedCount' },
    { id: 'master_incorrect_10', name: '查漏补缺', description: '成功掌握10道错题。', icon: '💡', target: 10, type: 'count' },
    { id: 'master_incorrect_50', name: '融会贯通', description: '成功掌握50道错题。', icon: '🧠', target: 50, type: 'count' },
    { id: 'review_guru', name: '复习大师', description: '累计进行错题回顾练习20次。', icon: '🔄', target: 20, type: 'count' }
];