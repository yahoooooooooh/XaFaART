/**
轻量级Markdown渲染器类
*/
class MarkdownRenderer {
    constructor() {
        this.rules = [
            // 标题 - 按顺序处理，避免冲突
            { pattern: /^### (.*$)/gim, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.*$)/gim, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.*$)/gim, replacement: '<h1>$1</h1>' },

            // 粗体和斜体
            { pattern: /\*\*\*(.*?)\*\*\*/g, replacement: '<strong><em>$1</em></strong>' },
            { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },

            // 代码块
            { pattern: /```([\s\S]*?)```/g, replacement: '<pre><code>$1</code></pre>' },
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },

            // 列表项
            { pattern: /^\s*[\*\-]\s+(.*$)/gim, replacement: '<li>$1</li>' },
            { pattern: /^\s*\d+\.\s+(.*$)/gim, replacement: '<li class="ordered">$1</li>' },

            // 链接
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank">$1</a>' },

            // 换行处理 - 最后处理
            { pattern: /\n\n+/g, replacement: '</p><p>' },
            { pattern: /\n/g, replacement: '<br>' }
        ];


    }

    render(markdown) {
        if (!markdown || typeof markdown !== 'string') return '';

        let html = markdown.trim();

        this.rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });

        html = html.replace(/(<li>.*?<\/li>(?:\s*<br\s*\/?>*\s*<li>.*?<\/li>)*)/g, (match) => {
            if (match.includes('<li class="ordered">')) {
                return match;
            }
            return `<ul>${match.replace(/\s*<br\s*\/?>*\s*(<li>)/g, '$1')}</ul>`;
        });

        html = html.replace(/(<li class="ordered">.*?<\/li>(?:\s*<br\s*\/?>*\s*<li class="ordered">.*?<\/li>)*)/g, (match) => {
            let items = match.replace(/<li class="ordered">/g, '<li>');
            return `<ol>${items.replace(/\s*<br\s*\/?>*\s*(<li>)/g, '$1')}</ol>`;
        });

        const blockElements = /^(?:<[hH][1-6]>|<[uUoO][lL]>|<[pP]>|<pre>|<blockquote|>)/;
        if (!blockElements.test(html.trim()) && html.trim().length > 0) {
            if (!html.includes("</p><p>") && !html.startsWith("<p>") && !html.endsWith("</p>")) {
                html = `<p>${html}</p>`;
            }
        }
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<br\s*\/?>\s*<\/p>/g, '</p>');
        html = html.replace(/<br\s*\/?>\s*<\/li>/g, '</li>');


        return html;
    }

    renderStreaming(container, content, speed = 25) {
        return new Promise(resolve => {
            container.innerHTML = '';
            const textNode = document.createTextNode('');
            container.appendChild(textNode);
            let i = 0;
            const tick = () => {
                if (i < content.length) {
                    textNode.textContent += content[i++];
                    setTimeout(tick, speed);
                } else {
                    container.innerHTML = this.render(content);
                    resolve();
                }
            };
            tick();
        });
    }
}