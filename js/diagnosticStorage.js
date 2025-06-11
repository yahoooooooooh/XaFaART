// diagnosticStorage.js
const DB_NAME = 'AiDiagnosticDB';
const DB_VERSION = 1;
const SESSIONS_STORE_NAME = 'diagnosticSessions';
const META_STORE_NAME = 'diagnosticSessionsMeta';

class DiagnosticStorage {
    constructor() {
        this.db = null;
        this._initDB();
    }

    async _initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("DiagnosticStorage DB initialized");
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(SESSIONS_STORE_NAME)) {
                    db.createObjectStore(SESSIONS_STORE_NAME, { keyPath: 'sessionId' });
                }
                if (!db.objectStoreNames.contains(META_STORE_NAME)) {
                    const metaStore = db.createObjectStore(META_STORE_NAME, { keyPath: 'sessionId' });
                    metaStore.createIndex('lastModified', 'lastModified', { unique: false });
                }
            };
        });
    }

    async _getStore(storeName, mode = 'readonly') {
        if (!this.db) await this._initDB();
        return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    async createSession(initialMessages = []) {
        const sessionId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();
        const sessionData = { sessionId, conversation: initialMessages, lastModified: now };
        const metaData = { sessionId, title: `诊断 ${new Date(now).toLocaleString()}`, lastModified: now };

        const sessionStore = await this._getStore(SESSIONS_STORE_NAME, 'readwrite');
        sessionStore.add(sessionData);

        const metaStore = await this._getStore(META_STORE_NAME, 'readwrite');
        metaStore.add(metaData);

        return sessionId;
    }

    async getSession(sessionId) {
        const store = await this._getStore(SESSIONS_STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.get(sessionId);
            request.onsuccess = () => resolve(request.result ? request.result.conversation : null);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async updateSession(sessionId, conversationHistory) {
        const store = await this._getStore(SESSIONS_STORE_NAME, 'readwrite');
        const metaStore = await this._getStore(META_STORE_NAME, 'readwrite');
        const now = Date.now();

        // 更新会话内容
        store.put({ sessionId, conversation: conversationHistory, lastModified: now });

        // 更新元数据中的最后修改时间
        const metaRequest = metaStore.get(sessionId);
        metaRequest.onsuccess = () => {
            const metaData = metaRequest.result;
            if (metaData) {
                metaData.lastModified = now;
                // 如果是第一次有有效消息，可以更新标题
                if (conversationHistory.length > 1 && metaData.title.startsWith("诊断 ")) { // 假设初始系统消息不算
                    const firstUserOrAIMessage = conversationHistory.find(m => m.role !== 'system');
                    if (firstUserOrAIMessage && firstUserOrAIMessage.content) {
                        metaData.title = firstUserOrAIMessage.content.substring(0, 30) + (firstUserOrAIMessage.content.length > 30 ? "..." : "");
                    }
                }
                metaStore.put(metaData);
            }
        };
    }

    async getAllSessionsMeta() {
        const store = await this._getStore(META_STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.index('lastModified').getAll(); // 获取并按lastModified排序（如果index支持）
            request.onsuccess = () => {
                // IndexedDB getAll on index doesn't sort by default, sort manually
                const sortedMetas = request.result.sort((a, b) => b.lastModified - a.lastModified);
                resolve(sortedMetas);
            }
            request.onerror = (event) => reject(event.target.error);
        });
    }
    // ... 其他方法如 deleteSession, getLatestSessionId
}
window.diagnosticStorage = new DiagnosticStorage();