// js/utils.js

const Utils = {
    /**
     * 格式化时间显示 (毫秒转为 xx小时xx分钟xx秒)
     * @param {number} milliseconds - 毫秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatTime: function(milliseconds) {
        if (milliseconds === null || typeof milliseconds === 'undefined' || milliseconds < 0 || isNaN(milliseconds)) return '0秒';

        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let parts = [];
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);
        // 即使只有0秒，如果前面没有小时和分钟，也显示0秒
        if (seconds > 0 || (hours === 0 && minutes === 0)) parts.push(`${seconds}秒`);

        return parts.length > 0 ? parts.join('') : '0秒';
    },

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID字符串
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    },

    /**
     * 提取AI响应中的文本内容 (处理parts数组)
     * @param {Array|Object} candidateContent - AI响应的 candidates[0].content 部分
     * @returns {string} 合并后的纯文本
     */
    extractTextFromAiResponse: function(candidateContent) {
        if (!candidateContent) return '';
        let partsToProcess = candidateContent.parts || [];
        let combinedText = '';

        if (partsToProcess && Array.isArray(partsToProcess)) {
            combinedText = partsToProcess
                .map(p => {
                    if (typeof p === 'string') return p;
                    if (p?.text) return p.text;
                    // 简单处理，如果需要支持图片等复杂类型，这里需要扩展
                    if (p?.inlineData?.data) {
                        try { return atob(p.inlineData.data); } // 假设是base64文本
                        catch (e) { console.warn("Utils: Failed to decode base64 inlineData:", e); return '';}
                    }
                    return '';
                })
                .join('')
                .trim();
        }
        // 有些AI模型可能直接在content下有text字段，而不是parts数组
        if (!combinedText && typeof candidateContent.text === 'string') {
            combinedText = candidateContent.text.trim();
        }
        return combinedText;
    }

    // 未来可以添加更多通用工具函数，例如：
    // deepClone: function(obj) { /* ... */ },
    // debounce: function(func, wait) { /* ... */ },
};

// 将Utils挂载到window对象，使其全局可用
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}