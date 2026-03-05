// js/storage/offlineQueue.js
import { DBStore } from './indexedDB.js';

export class OfflineQueue {
    static MAX_RETRIES = 5;

    /**
     * Enqueue a sync task with path-level deduplication.
     * If an entry already exists for the same file path:
     *   - DELETE always wins over UPDATE
     *   - UPDATE replaces previous UPDATE (latest content wins)
     *   - INDEX updates replace previous INDEX entries
     * This collapses rapid edits to the same note into a single commit.
     */
    static async enqueue(task) {
        const queue = await DBStore.getSyncQueue();
        const path = task.payload?.path;

        if (path) {
            // Find existing entry for this path
            const existing = queue.find(t => t.payload?.path === path);
            if (existing) {
                // DELETE wins over everything
                if (task.type === 'DELETE' || existing.type !== 'DELETE') {
                    // Remove the old entry and replace with the new one
                    await DBStore.deleteSyncTask(existing.id);
                }
                // If existing is DELETE and new is UPDATE, skip — keep the DELETE
                else {
                    return;
                }
            }
        }

        await DBStore.addSyncTask({ ...task, timestamp: Date.now(), retryCount: 0 });
    }

    /**
     * Mark a task as failed. If retryCount >= MAX_RETRIES, dispatch a
     * 'queue-task-failed' event so the UI can notify the user.
     * Returns true if the task should be abandoned (dead-letter), false if still retryable.
     */
    static async markFailed(task) {
        const retryCount = (task.retryCount || 0) + 1;
        if (retryCount >= this.MAX_RETRIES) {
            console.error(`[OfflineQueue] Task permanently failed after ${retryCount} retries:`, task.payload?.path || task.type);
            await DBStore.deleteSyncTask(task.id);
            document.dispatchEvent(new CustomEvent('queue-task-failed', { detail: { task } }));
            return true; // dead-lettered
        }
        // Update retry counter in IDB
        await DBStore.deleteSyncTask(task.id);
        await DBStore.addSyncTask({ ...task, retryCount, timestamp: Date.now() });
        return false; // will retry
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
