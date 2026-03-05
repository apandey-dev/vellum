// js/storage/offlineQueue.js
import { DBStore } from './indexedDB.js';

export class OfflineQueue {
    static async enqueue(task) {
        await DBStore.addSyncTask({ ...task, timestamp: Date.now() });
    }

    static async dequeue(taskId) {
        await DBStore.deleteSyncTask(taskId);
    }

    static async getQueue() {
        return await DBStore.getSyncQueue();
    }

    static async clear() {
        await DBStore.clearSyncQueue();
    }
}
