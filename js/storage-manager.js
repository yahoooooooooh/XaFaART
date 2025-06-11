/**
 * IndexedDB存储管理器
 * 解决localStorage容量限制问题，支持大容量题库存储
 */

class IndexedDBStorageManager {
    constructor() {
        this.dbName = 'ArtQuizDB';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            quizData: 'quizData',           // 题库数据
            userProgress: 'userProgress',   // 用户进度
            settings: 'settings',           // 应用设置
            backup: 'backup'                // 备份数据
        };
        this.isSupported = this.checkIndexedDBSupport();
        this.fallbackToLocalStorage = false;
        this.isInitialized = false;
        this.migrationFlagKey = 'artQuizData_migrated_to_idb'; // Key for the migration flag
    }

    /**
     * 检查IndexedDB支持情况
     */
    checkIndexedDBSupport() {
        return !!(window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB);
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.isInitialized) { // Prevent re-initialization
            console.log("StorageManager: Already initialized.");
            return true;
        }

        if (!this.isSupported) {
            console.warn('IndexedDB不受支持，将回退到localStorage');
            this.fallbackToLocalStorage = true;
            this.isInitialized = true;
            return true;
        }

        try {
            this.db = await this.openDatabase();
            console.log('✅ IndexedDB初始化成功');
            
            // 检查是否需要从localStorage迁移数据
            await this.migrateFromLocalStorage(); // This will now be conditional
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ IndexedDB初始化失败，回退到localStorage:', error);
            this.fallbackToLocalStorage = true;
            this.isInitialized = true; // Mark as initialized even on fallback
            return false;
        }
    }

    /**
     * 打开数据库
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("IndexedDB openDatabase error:", event.target.error);
                reject(request.error);
            };
            request.onsuccess = (event) => {
                console.log("IndexedDB openDatabase success.");
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log("IndexedDB onupgradeneeded triggered.");
                
                Object.values(this.stores).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { 
                            // Using 'id' as keyPath for all stores.
                            // 'quizData' in DataManager uses 'main' as the ID.
                            // 'userProgress' also uses 'main'.
                            // 'backup' uses unique backup names/timestamps.
                            // 'settings' might use specific setting keys.
                            // This keyPath implies that the objects stored must have an 'id' property.
                            keyPath: 'id', 
                            autoIncrement: false // DataManager provides IDs like 'main'
                        });
                        
                        if (storeName === this.stores.backup) {
                            // Ensure 'timestamp' is part of the data object stored if used as index
                            // The current setItem for backup stores {id, data:{name,timestamp,data,size}, timestamp, version}
                            // So, the index should be on 'data.timestamp' or 'timestamp' (if it's top-level)
                            // Based on current setItem, the top-level 'timestamp' is better.
                            if (!store.indexNames.contains('timestamp')) {
                                store.createIndex('timestamp', 'timestamp', { unique: false });
                            }
                        }
                        
                        console.log(`创建对象存储: ${storeName}`);
                    }
                });
            };
        });
    }

    /**
     * 从localStorage迁移数据 (Conditional Migration)
     */
    async migrateFromLocalStorage() {
        if (this.fallbackToLocalStorage || !this.db) {
            console.log("StorageManager: Skipping migration (fallback to localStorage or DB not open).");
            return;
        }

        // Check if migration has already been flagged as done
        if (localStorage.getItem(this.migrationFlagKey) === 'true') {
            console.log('StorageManager: 🔄 跳过localStorage迁移（已标记完成）');
            return;
        }

        try {
            // Specifically check if 'quizData.main' already exists in IndexedDB
            const existingIDBQuizData = await this.getItem(this.stores.quizData, 'main');
            if (existingIDBQuizData) {
                console.log('StorageManager: 🔄 跳过localStorage迁移（IndexedDB中已存在quizData.main）');
                localStorage.setItem(this.migrationFlagKey, 'true'); // Mark as done
                return;
            }

            console.log('StorageManager: 🚀 开始首次localStorage数据迁移...');
            let migrationOccurred = false;

            // --- Migrate Quiz Data ---
            const localQuizDataString = localStorage.getItem('artQuizData'); // Legacy key from DataManager
            if (localQuizDataString) {
                try {
                    const quizData = JSON.parse(localQuizDataString);
                    // The ID for the main quiz data structure is 'main' in DataManager
                    await this.setItem(this.stores.quizData, 'main', quizData);
                    console.log('✅ 题库数据迁移到IndexedDB完成');
                    // Optional: Create a backup of the migrated data in IndexedDB itself
                    // await this.createBackup('localStorage_quizData_migration', quizData);
                    migrationOccurred = true;
                } catch (e) {
                    console.error("Error parsing or saving legacy quizData during migration:", e);
                }
            }

            // --- Migrate User Progress ---
            const localProgressDataString = localStorage.getItem('artQuizData_userProgress'); // Legacy key
            if (localProgressDataString) {
                try {
                    const progressData = JSON.parse(localProgressDataString);
                    // Assuming user progress is also stored with an ID like 'main' or a user-specific ID
                    await this.setItem(this.stores.userProgress, 'main', progressData);
                    console.log('✅ 用户进度迁移到IndexedDB完成');
                    migrationOccurred = true;
                } catch (e) {
                    console.error("Error parsing or saving legacy userProgress during migration:", e);
                }
            }
            
            // --- Migrate Settings (Example) ---
            // const localSettingsString = localStorage.getItem('artQuizData_settings');
            // if (localSettingsString) {
            //     try {
            //         const settingsData = JSON.parse(localSettingsString);
            //         await this.setItem(this.stores.settings, 'appSettings', settingsData); // Example ID
            //         console.log('✅ 应用设置迁移到IndexedDB完成');
            //         migrationOccurred = true;
            //     } catch (e) {
            //         console.error("Error parsing or saving legacy settings during migration:", e);
            //     }
            // }


            if (migrationOccurred) {
                this.showMigrationSuccess();
                localStorage.setItem(this.migrationFlagKey, 'true'); // Set flag after successful migration steps
                console.log('StorageManager: ✅ localStorage数据迁移完成并已标记。');

                // Optional: Clean up old localStorage items after successful migration
                // Be very careful with this. Only do it if you are sure.
                // localStorage.removeItem('artQuizData');
                // localStorage.removeItem('artQuizData_userProgress');
                // console.log('StorageManager: 旧的localStorage数据已清理 (可选步骤)。');
            } else {
                console.log('StorageManager: 未找到可迁移的localStorage数据。');
                // Still set the flag if nothing was found, to prevent re-checking every time.
                localStorage.setItem(this.migrationFlagKey, 'true');
            }

        } catch (error) {
            console.error('StorageManager: 数据迁移过程中发生错误:', error);
            // Do not set the flag if a critical error occurred during the process itself,
            // allowing a retry on next init, unless specific errors are handled.
        }
    }


    /**
     * 显示迁移成功提示
     */
    showMigrationSuccess() {
        if (window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('数据已升级到IndexedDB存储，支持更大容量！', 'success', 5000);
        } else {
            console.log('数据已升级到IndexedDB存储，支持更大容量！');
        }
    }

    /**
     * 存储数据
     */
    async setItem(storeName, id, data) {
        if (!id) {
            console.error(`IndexedDB存储失败: ID不能为空 for store ${storeName}`);
            throw new Error("ID cannot be null or undefined for setItem.");
        }
        if (this.fallbackToLocalStorage) {
            // For quizData, the 'id' from DataManager is 'main'.
            // The localStorage key in DataManager is 'artQuizData'.
            // We need to map this correctly.
            let localStorageKey = `${storeName}_${id}`;
            if (storeName === this.stores.quizData && id === 'main') {
                localStorageKey = 'artQuizData'; // Match DataManager's legacy key for quizData
            } else if (storeName === this.stores.userProgress && id === 'main') {
                localStorageKey = 'artQuizData_userProgress'; // Match legacy key
            }
            return this.setItemLocalStorageByKey(localStorageKey, data);
        }

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const item = {
                id: id, // This 'id' must match the keyPath of the object store
                data: data,
                timestamp: Date.now(),
                // Use AppConfig if available, otherwise default
                version: (typeof window !== 'undefined' && window.AppConfig?.APP_CONFIG?.version) || 'N/A'
            };

            await new Promise((resolve, reject) => {
                const request = store.put(item); // 'item' object itself is stored. 'id' property is the key.
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    console.error(`IndexedDB put error for ${storeName}.${id}:`, event.target.error);
                    reject(request.error);
                };
            });

            console.log(`💾 数据已保存到IndexedDB: ${storeName}.${id}`);
            return true;
        } catch (error) {
            console.error(`IndexedDB存储失败: ${storeName}.${id}`, error);
            throw error;
        }
    }

    /**
     * 获取数据
     */
    async getItem(storeName, id) {
        if (!id) {
            console.error(`IndexedDB读取失败: ID不能为空 for store ${storeName}`);
            return null;
        }
        if (this.fallbackToLocalStorage) {
            let localStorageKey = `${storeName}_${id}`;
            if (storeName === this.stores.quizData && id === 'main') {
                localStorageKey = 'artQuizData';
            } else if (storeName === this.stores.userProgress && id === 'main') {
                localStorageKey = 'artQuizData_userProgress';
            }
            return this.getItemLocalStorageByKey(localStorageKey);
        }

        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            const result = await new Promise((resolve, reject) => {
                const request = store.get(id); // Get by 'id' which is the keyPath
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    console.error(`IndexedDB get error for ${storeName}.${id}:`, event.target.error);
                    reject(request.error);
                }
            });

            return result ? result.data : null; // Return the 'data' field from the stored object
        } catch (error) {
            console.error(`IndexedDB读取失败: ${storeName}.${id}`, error);
            return null;
        }
    }

    /**
     * 删除数据
     */
    async removeItem(storeName, id) {
        if (!id) {
            console.error(`IndexedDB删除失败: ID不能为空 for store ${storeName}`);
            return false;
        }
        if (this.fallbackToLocalStorage) {
            let localStorageKey = `${storeName}_${id}`;
            if (storeName === this.stores.quizData && id === 'main') {
                localStorageKey = 'artQuizData';
            } else if (storeName === this.stores.userProgress && id === 'main') {
                localStorageKey = 'artQuizData_userProgress';
            }
            return this.removeItemLocalStorageByKey(localStorageKey);
        }

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            await new Promise((resolve, reject) => {
                const request = store.delete(id); // Delete by 'id'
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                     console.error(`IndexedDB delete error for ${storeName}.${id}:`, event.target.error);
                    reject(request.error);
                }
            });

            console.log(`🗑️ 数据已从IndexedDB删除: ${storeName}.${id}`);
            return true;
        } catch (error) {
            console.error(`IndexedDB删除失败: ${storeName}.${id}`, error);
            return false;
        }
    }

    /**
     * 获取存储大小信息
     */
    async getStorageInfo() {
        if (this.fallbackToLocalStorage) {
            return this.getLocalStorageInfo();
        }
         if (!this.db) {
            console.warn("getStorageInfo: IndexedDB not available.");
            return { type: 'IndexedDB', supported: false, error: "Database not open." };
        }

        try {
            const info = {
                type: 'IndexedDB',
                supported: true,
                stores: {}
            };

            for (const storeName of Object.values(this.stores)) {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`Store ${storeName} not found in DB for getStorageInfo.`);
                    info.stores[storeName] = { itemCount: 0, estimatedSize: '0 Bytes', sizeBytes: 0, error: 'Store not found' };
                    continue;
                }
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);

                const count = await new Promise((resolve, reject) => {
                    const request = store.count();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = (e) => { console.error(`Error counting ${storeName}: ${e.target.error}`); reject(e.target.error); };
                });

                const allItems = await new Promise((resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = (e) => { console.error(`Error getAll ${storeName}: ${e.target.error}`); reject(e.target.error); };
                });

                const size = new Blob([JSON.stringify(allItems)]).size;

                info.stores[storeName] = {
                    itemCount: count,
                    estimatedSize: this.formatBytes(size),
                    sizeBytes: size
                };
            }

            if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                info.quota = {
                    used: this.formatBytes(estimate.usage || 0),
                    total: this.formatBytes(estimate.quota || 0),
                    usedBytes: estimate.usage || 0,
                    totalBytes: estimate.quota || 0,
                    percentage: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : '未知'
                };
            }

            return info;
        } catch (error) {
            console.error('获取IndexedDB存储信息失败:', error);
            return { type: 'IndexedDB', supported: this.isSupported, error: error.message };
        }
    }

    /**
     * 创建备份
     */
    async createBackup(backupName = null, specificData = null) {
         if (this.fallbackToLocalStorage) {
            console.warn("Backup creation not supported in localStorage fallback mode.");
            throw new Error("Backup creation not supported in localStorage mode.");
        }
        if (!this.db) {
            console.error("CreateBackup: IndexedDB not available.");
            throw new Error("Database not open for backup.");
        }
        try {
            const backupId = backupName || `backup_${Date.now()}`; // This is the keyPath 'id'
            const timestamp = new Date().toISOString();

            let backupDataContent; // This is the 'data' field of the item to be stored
            if (specificData) {
                backupDataContent = {
                    name: backupId, // name inside the data field
                    timestamp: timestamp,
                    data: specificData, // the actual data to backup
                    version: (typeof window !== 'undefined' && window.AppConfig?.APP_CONFIG?.version) || 'N/A',
                };
            } else {
                const quizData = await this.getItem(this.stores.quizData, 'main');
                const progressData = await this.getItem(this.stores.userProgress, 'main');
                
                backupDataContent = {
                    name: backupId,
                    timestamp: timestamp,
                    data: { // Nesting the actual app data inside a 'data' field
                        quizData: quizData,
                        userProgress: progressData,
                    },
                    version: (typeof window !== 'undefined' && window.AppConfig?.APP_CONFIG?.version) || 'N/A',
                };
            }
            // Add size to the backupDataContent which is the 'data' part of the stored item
            backupDataContent.size = new Blob([JSON.stringify(backupDataContent.data)]).size;


            // The item to store in backup store must have an 'id' property matching backupId
            // and the rest is the 'data' for that item
            await this.setItem(this.stores.backup, backupId, backupDataContent);


            console.log(`✅ 备份创建成功: ${backupId}`);
            return backupId;
        } catch (error) {
            console.error('创建备份失败:', error);
            throw error;
        }
    }

    /**
     * 获取备份列表
     */
    async getBackupList() {
        if (this.fallbackToLocalStorage) {
            console.warn("Backup list not supported in localStorage fallback mode.");
            return []; 
        }
         if (!this.db) {
            console.warn("getBackupList: IndexedDB not available.");
            return [];
        }

        try {
            const transaction = this.db.transaction([this.stores.backup], 'readonly');
            const store = transaction.objectStore(this.stores.backup);

            const backupsFromDB = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => { console.error(`Error getAll backups: ${e.target.error}`); reject(e.target.error); };
            });
            
            // backupsFromDB contains items like { id: "backup_123", data: { name:"backup_123", timestamp:"...", data:{...}, size:123 }, timestamp: "...", version: "..." }
            // We need to map this to the expected output structure
            return backupsFromDB.map(storedItem => ({
                id: storedItem.id, // The keyPath 'id' of the stored item
                name: storedItem.data.name, // Name from within the 'data' field of the stored item
                timestamp: storedItem.data.timestamp, // Timestamp from within the 'data' field
                size: this.formatBytes(storedItem.data.size || 0),
                sizeBytes: storedItem.data.size || 0
            })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('获取备份列表失败:', error);
            return [];
        }
    }

    /**
     * 恢复备份
     */
    async restoreBackup(backupId) {
         if (this.fallbackToLocalStorage) {
            console.warn("Backup restoration not supported in localStorage fallback mode.");
            throw new Error("Backup restoration not supported in localStorage mode.");
        }
        if (!this.db) {
            console.error("RestoreBackup: IndexedDB not available.");
            throw new Error("Database not open for backup restoration.");
        }
        try {
            // getItem will return the 'data' field of the stored backup item.
            // So, 'backupItemData' is { name:"backup_123", timestamp:"...", data:{quizData:...}, size:123 }
            const backupItemData = await this.getItem(this.stores.backup, backupId);
            if (!backupItemData) {
                throw new Error('备份不存在或无法读取');
            }

            // The actual application data (quizData, userProgress) is nested inside backupItemData.data
            const appDataToRestore = backupItemData.data; 
            
            if (appDataToRestore && appDataToRestore.quizData) {
                await this.setItem(this.stores.quizData, 'main', appDataToRestore.quizData);
            }
            
            if (appDataToRestore && appDataToRestore.userProgress) {
                await this.setItem(this.stores.userProgress, 'main', appDataToRestore.userProgress);
            }

            console.log(`✅ 备份恢复成功: ${backupId}`);
            return true;
        } catch (error) {
            console.error(`恢复备份 ${backupId} 失败:`, error);
            throw error;
        }
    }


    /**
     * 清理旧备份
     */
    async cleanupOldBackups(keepCount = 10) {
        if (this.fallbackToLocalStorage || !this.db) return;
        try {
            const backups = await this.getBackupList(); // This returns sorted list, newest first
            if (backups.length <= keepCount) return;

            // Backups are sorted newest first, so slice from keepCount to the end
            const toDelete = backups.slice(keepCount); 
            for (const backup of toDelete) {
                await this.removeItem(this.stores.backup, backup.id); // backup.id is the keyPath
            }

            if (toDelete.length > 0) {
                console.log(`🗑️ 已清理 ${toDelete.length} 个旧备份`);
            }
        } catch (error) {
            console.error('清理备份失败:', error);
        }
    }

    /**
     * 检查存储健康状况
     */
    async checkStorageHealth() {
        const info = await this.getStorageInfo();
        const health = {
            status: 'good',
            warnings: [],
            recommendations: []
        };

        if (this.fallbackToLocalStorage) {
            health.status = 'limited';
            health.warnings.push('正在使用localStorage存储，容量有限');
            health.recommendations.push('升级浏览器以支持IndexedDB获得更大存储容量');
            // Add localStorage specific quota check if possible
            if (info.quota && info.quota.percentage) {
                 const usagePercentage = parseFloat(info.quota.percentage);
                 if (usagePercentage > 80) health.warnings.push('localStorage空间使用率较高');
            }
            return health;
        }
        
        if (info.error) {
            health.status = 'error';
            health.warnings.push(`获取存储信息时出错: ${info.error}`);
            return health;
        }


        if (info.quota && info.quota.percentage && info.quota.percentage !== '未知') {
            const usagePercentage = parseFloat(info.quota.percentage);
            
            if (usagePercentage > 90) { // Stricter for critical
                health.status = 'critical';
                health.warnings.push('存储空间使用率超过90%');
                health.recommendations.push('强烈建议立即清理旧备份或导出数据以释放空间！');
            } else if (usagePercentage > 75) { // Warning threshold
                health.status = 'warning';
                health.warnings.push('存储空间使用率超过75%');
                health.recommendations.push('建议清理旧备份或导出数据');
            }
        } else if (info.quota) {
            health.warnings.push('无法精确计算存储配额百分比。');
        }


        return health;
    }

    /**
     * 导出所有数据
     */
    async exportAllData() {
        try {
            const quizData = await this.getItem(this.stores.quizData, 'main');
            const progressData = await this.getItem(this.stores.userProgress, 'main');
            const settingsData = await this.getItem(this.stores.settings, 'appSettings'); // Example
            const storageInfo = await this.getStorageInfo();

            const exportObject = {
                version: (typeof window !== 'undefined' && window.AppConfig?.APP_CONFIG?.version) || 'N/A',
                exportTime: new Date().toISOString(),
                storageType: this.fallbackToLocalStorage ? 'localStorage' : 'IndexedDB',
                // storageInfo: storageInfo, // Can be very large, optional
                data: {
                    [this.stores.quizData]: quizData,
                    [this.stores.userProgress]: progressData,
                    [this.stores.settings]: settingsData
                }
            };

            const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `art_quiz_full_export_${new Date().toISOString().split('T')[0].replace(/-/g,'')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ 数据导出完成');
            return true;
        } catch (error) {
            console.error('导出数据失败:', error);
            throw error;
        }
    }

    // ============ LocalStorage 回退方法 (Modified to use specific keys) ============

    setItemLocalStorageByKey(key, data) { // Changed method name for clarity
        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`💾 数据已保存到localStorage: ${key}`);
            return true;
        } catch (error) {
            console.error(`localStorage存储失败 (${key}):`, error);
            if (error.name === 'QuotaExceededError') {
                alert('存储空间不足！无法保存到localStorage。请尝试清理浏览器数据。');
            }
            throw error;
        }
    }

    getItemLocalStorageByKey(key) { // Changed method name for clarity
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`localStorage读取失败 (${key}):`, error);
            return null;
        }
    }

    removeItemLocalStorageByKey(key) { // Changed method name for clarity
        try {
            localStorage.removeItem(key);
            console.log(`🗑️ 数据已从localStorage删除: ${key}`);
            return true;
        } catch (error) {
            console.error(`localStorage删除失败 (${key}):`, error);
            return false;
        }
    }


    getLocalStorageInfo() {
        try {
            let totalSizeBytes = 0;
            const info = {
                type: 'localStorage (回退)',
                supported: true, // If we are here, localStorage is being used.
                stores: {} // This will be an approximation based on known keys
            };
            
            const knownPrefixes = Object.values(this.stores).map(s => `${s}_`);
            const knownFullKeys = ['artQuizData', 'artQuizData_userProgress', 'artQuizData_settings', this.migrationFlagKey];


            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    const itemSizeBytes = (key.length + value.length) * 2; // Rough estimate (UTF-16)
                    totalSizeBytes += itemSizeBytes;

                    let assignedStore = 'other_localStorage';
                    if (knownFullKeys.includes(key)) {
                        if (key === 'artQuizData') assignedStore = this.stores.quizData;
                        else if (key === 'artQuizData_userProgress') assignedStore = this.stores.userProgress;
                        else if (key === 'artQuizData_settings') assignedStore = this.stores.settings;
                    } else {
                        for (const prefix of knownPrefixes) {
                            if (key.startsWith(prefix)) {
                                assignedStore = prefix.slice(0, -1); // Remove trailing '_'
                                break;
                            }
                        }
                    }
                    
                    if (!info.stores[assignedStore]) {
                        info.stores[assignedStore] = { itemCount: 0, sizeBytes: 0 };
                    }
                    info.stores[assignedStore].itemCount++;
                    info.stores[assignedStore].sizeBytes += itemSizeBytes;
                }
            }


            Object.keys(info.stores).forEach(storeName => {
                info.stores[storeName].estimatedSize = this.formatBytes(info.stores[storeName].sizeBytes);
            });

            const estimatedLimitBytes = 5 * 1024 * 1024; // 5MB typical limit
            info.quota = {
                used: this.formatBytes(totalSizeBytes),
                total: this.formatBytes(estimatedLimitBytes),
                usedBytes: totalSizeBytes,
                totalBytes: estimatedLimitBytes,
                percentage: totalSizeBytes > 0 && estimatedLimitBytes > 0 ? ((totalSizeBytes / estimatedLimitBytes) * 100).toFixed(2) : '0.00'
            };

            return info;
        } catch (error) {
            console.error("Error getting localStorage info:", error);
            return { type: 'localStorage (回退)', supported: true, error: error.message, stores: {}, quota: {} };
        }
    }

    /**
     * 格式化字节大小
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === null || typeof bytes === 'undefined' || isNaN(bytes) || bytes < 0) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// 创建全局存储管理器实例
// Ensure AppConfig is available or provide defaults for version
if (typeof window !== 'undefined') {
    window.storageManager = new IndexedDBStorageManager();
}