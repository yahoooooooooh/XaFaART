// js/config.js

// 确保 AppConfig 对象存在，以便其他文件可以安全地向其添加属性
window.AppConfig = window.AppConfig || {};

// ===== 应用配置 =====
window.AppConfig.APP_CONFIG = {
    version: "2.1.1",
    name: "学习助手",
    description: "艺术史与世界常识题库系统 - 考研专业版",
    storageKey: "artQuizData",

    ai: {
        model: 'deepseek-chat',
        // --- 修改开始 ---
        key: '', // 1. API密钥已从此移除！
        baseUrl: '/api/proxy' // 2. API地址指向Vercel的代理函数
        // --- 修改结束 ---
    },

    difficulty: {
        easy: { name: '初级', icon: '🟢', color: '#48bb78' },
        medium: { name: '中级', icon: '🟡', color: '#ed8936' },
        hard: { name: '高级', icon: '🔴', color: '#e53e3e' }
    },

    ui: {
        animations: {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        icons: {
            subjects: ['🎭', '🖼️', '🏛️', '🌸', '🏺', '📜', '🎪', '🎨', '🖌️', '📝', '⚔️', '🚩', '🔤', '🌍', '🏯', '🐘', '🏝️', '🕌', '🧘'],
            random: ['✨', '💡', '⭐', '🔥', '🌟', '📚', '🎓']
        }
    }
};