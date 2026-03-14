import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

const DB_NAME = 'mall_ops_offline';
const DB_VERSION = 1;

class OfflineStorage {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('pendingSubmissions')) {
          db.createObjectStore('pendingSubmissions', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cachedTasks')) {
          db.createObjectStore('cachedTasks', { keyPath: 'task_id' });
        }
        if (!db.objectStoreNames.contains('cachedStores')) {
          db.createObjectStore('cachedStores', { keyPath: 'store_id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async ready() {
    await this.initPromise;
    return this.db;
  }

  async savePendingSubmission(submission) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingSubmissions', 'readwrite');
      const store = tx.objectStore('pendingSubmissions');
      const request = store.add({
        ...submission,
        timestamp: new Date().toISOString(),
        synced: false
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSubmissions() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingSubmissions', 'readonly');
      const store = tx.objectStore('pendingSubmissions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingSubmission(id) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingSubmissions', 'readwrite');
      const store = tx.objectStore('pendingSubmissions');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cacheTasks(tasks) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedTasks', 'readwrite');
      const store = tx.objectStore('cachedTasks');
      tasks.forEach(task => store.put(task));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedTasks() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedTasks', 'readonly');
      const store = tx.objectStore('cachedTasks');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheStores(stores) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedStores', 'readwrite');
      const store = tx.objectStore('cachedStores');
      stores.forEach(s => store.put(s));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedStores() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cachedStores', 'readonly');
      const store = tx.objectStore('cachedStores');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(action, data) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.add({
        action,
        data,
        timestamp: new Date().toISOString(),
        retries: 0
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSyncQueueItem(id) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const pending = await offlineStorage.getPendingSubmissions();
    const queue = await offlineStorage.getSyncQueue();
    setPendingCount(pending.length + queue.length);
  };

  const saveSubmissionOffline = async (submission) => {
    await offlineStorage.savePendingSubmission(submission);
    await offlineStorage.addToSyncQueue('submit', submission);
    await updatePendingCount();
  };

  const syncPendingData = async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const queue = await offlineStorage.getSyncQueue();
      
      for (const item of queue) {
        try {
          if (item.action === 'submit') {
            await axios.post(`${API}/submissions`, item.data, {
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          await offlineStorage.deleteSyncQueueItem(item.id);
        } catch (error) {
          console.error('Sync failed for item:', item.id, error);
          if (item.retries >= 3) {
            await offlineStorage.deleteSyncQueueItem(item.id);
          }
        }
      }

      const pending = await offlineStorage.getPendingSubmissions();
      for (const sub of pending) {
        try {
          await axios.post(`${API}/submissions`, sub, {
            withCredentials: true
          });
          await offlineStorage.deletePendingSubmission(sub.id);
        } catch (error) {
          console.error('Pending submission sync failed:', error);
        }
      }

      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveSubmissionOffline,
    syncPendingData,
    updatePendingCount
  };
};

export default OfflineStorage;

