// workers/syncWorker.js
// Web Worker for off-thread GitHub sync processing
//
// Runs heavy operations off the UI thread:
//   - Batch commit preparation (file deduplication + content encoding)
//   - Delta comparison and file list parsing
//   - Queue deduplication and collapse
//
// Communication protocol:
//   Main thread → Worker: postMessage({ type, payload })
//   Worker → Main thread: postMessage({ type, result?, error? })

// ==================== TOKEN ACCESS ====================
// Workers have no access to sessionStorage; main thread must pass the token.
let _token = null;
let _owner = null;
const BASE_URL = 'https://api.github.com';
const REPO = 'notes-storage';

// ==================== RATE LIMIT STATE ====================
let _rateLimitPauseUntil = 0;

async function workerFetch(endpoint, options = {}, retries = 3, backoff = 1000) {
    const now = Date.now();
    if (now < _rateLimitPauseUntil) {
        const waitMs = _rateLimitPauseUntil - now;
        self.postMessage({ type: 'RATE_LIMIT_WAIT', payload: { waitMs } });
        await sleep(waitMs);
    }

    const headers = {
        'Authorization': `Bearer ${_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    // Rate limit handling: back off until reset time
    if (response.status === 403 || response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        const resetAt = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
        const pauseUntil = resetAt > Date.now() ? resetAt : Date.now() + retryAfter * 1000;
        _rateLimitPauseUntil = pauseUntil;
        self.postMessage({ type: 'RATE_LIMIT_HIT', payload: { pauseUntil } });

        if (retries > 0) {
            await sleep(backoff);
            return workerFetch(endpoint, options, retries - 1, backoff * 2);
        }
        throw new Error('Rate limit exceeded; queue paused.');
    }

    if (response.status === 204) return true;
    if (response.status === 404) return null;
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(`GitHub ${response.status}: ${body.message || ''}`);
    }

    return response.json();
}

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// ==================== WORKER TASKS ====================

/**
 * DEDUPLICATE_QUEUE
 * Collapses multiple edits to the same file into a single entry.
 * DELETE wins over UPDATE if both exist for the same path.
 */
function deduplicateQueue(queue) {
    const fileMap = new Map();
    for (const task of queue) {
        const path = task.payload?.path;
        if (!path) continue;
        // DELETE beats UPDATE
        const existing = fileMap.get(path);
        if (!existing || task.type === 'DELETE') {
            fileMap.set(path, task);
        }
    }
    return Array.from(fileMap.values());
}

/**
 * ENCODE_FILES
 * Encodes file content to base64 for blob creation.
 */
function encodeBase64Unicode(str) {
    const bytes = new TextEncoder().encode(str || '');
    const binString = Array.from(bytes, b => String.fromCharCode(b)).join('');
    return btoa(binString);
}

/**
 * BATCH_COMMIT
 * Accepts a list of { path, content } file entries and creates a single
 * multi-file commit using the Git Data API.
 * content = null means delete the file from the tree.
 */
async function batchCommit(message, files) {
    const repoBase = `/repos/${_owner}/${REPO}`;

    // 1. Get the current HEAD commit SHA and tree SHA
    const refData = await workerFetch(`${repoBase}/git/ref/heads/main`);
    const headSha = refData.object.sha;
    const commitData = await workerFetch(`${repoBase}/git/commits/${headSha}`);
    const baseTreeSha = commitData.tree.sha;

    // 2. Create blobs for each non-deleted file
    const treeEntries = await Promise.all(files.map(async ({ path, content }) => {
        if (content === null) {
            // null signals deletion — omit from tree to remove the file
            return { path, mode: '100644', type: 'blob', sha: null };
        }
        const blob = await workerFetch(`${repoBase}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content: encodeBase64Unicode(content), encoding: 'base64' })
        });
        return { path, mode: '100644', type: 'blob', sha: blob.sha };
    }));

    // Filter out null-sha deletions properly
    const validEntries = treeEntries.filter(e => e.sha !== null);
    const deletedPaths = treeEntries.filter(e => e.sha === null).map(e => e.path);

    // 3. Create a new tree (base_tree excludes deleted paths automatically when sha is null)
    const allEntries = [
        ...validEntries,
        ...deletedPaths.map(path => ({ path, mode: '100644', type: 'blob', sha: null }))
    ];

    const newTree = await workerFetch(`${repoBase}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree: allEntries })
    });

    // 4. Create commit
    const newCommit = await workerFetch(`${repoBase}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] })
    });

    // 5. Update the ref
    await workerFetch(`${repoBase}/git/refs/heads/main`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha })
    });

    return newCommit.sha;
}

/**
 * COMPARE_COMMITS
 * Returns a list of changed file paths between two SHAs.
 */
async function compareCommits(base, head) {
    const data = await workerFetch(`/repos/${_owner}/${REPO}/compare/${base}...${head}`);
    return data?.files || [];
}

// ==================== MESSAGE HANDLER ====================

self.onmessage = async (event) => {
    const { type, payload, requestId } = event.data;

    const reply = (result) => self.postMessage({ type: `${type}_RESULT`, requestId, result });
    const replyError = (error) => self.postMessage({ type: `${type}_ERROR`, requestId, error: error.message });

    try {
        switch (type) {
            case 'INIT':
                _token = payload.token;
                _owner = payload.owner;
                reply({ ok: true });
                break;

            case 'BATCH_COMMIT': {
                const sha = await batchCommit(payload.message, payload.files);
                reply({ sha });
                break;
            }

            case 'COMPARE_COMMITS': {
                const files = await compareCommits(payload.base, payload.head);
                reply({ files });
                break;
            }

            case 'DEDUPLICATE_QUEUE': {
                const deduped = deduplicateQueue(payload.queue);
                reply({ queue: deduped });
                break;
            }

            case 'GET_FILE': {
                const repoBase = `/repos/${_owner}/${REPO}`;
                const fileData = await workerFetch(`${repoBase}/contents/${payload.path}`);
                if (!fileData?.content) { reply({ content: null }); break; }
                const decoded = new TextDecoder().decode(
                    Uint8Array.from(atob(fileData.content.replace(/\n/g, '')), c => c.charCodeAt(0))
                );
                reply({ content: decoded });
                break;
            }

            default:
                replyError(new Error(`Unknown worker task: ${type}`));
        }
    } catch (err) {
        replyError(err);
    }
};
