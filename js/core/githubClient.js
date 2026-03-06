// js/github-api.js
import { showToast } from '/utils/helpers.js';

export class GitHubAPI {
    static get BASE_URL() { return 'https://api.github.com'; }
    static get OWNER() { return sessionStorage.getItem('github_username'); }
    static get REPO() { return 'notes-storage'; }
    static _rateLimitPauseUntil = 0;

    static getToken() {
        return sessionStorage.getItem('github_token');
    }

    static clearSession() {
        sessionStorage.removeItem('github_token');
        sessionStorage.removeItem('github_username');
        window.location.href = '/login';
    }

    static async request(endpoint, options = {}, retries = 3, delay = 1000) {
        const token = this.getToken();
        if (!token) {
            // Token missing — do not call clearSession() here.
            // A missing token on first load can be a startup race condition.
            // Only clearSession() on a confirmed 401 from the GitHub API.
            throw new Error("No authentication token found. Please log in.");
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, { ...options, headers });

            // Handle Token Expiry / Invalid Token
            if (response.status === 401) {
                showToast("Session Expired. Please re-authenticate.", "error");
                this.clearSession();
                throw new Error("Unauthorized");
            }

            // Handle Rate Limiting — wait until reset time, then retry
            if (response.status === 403 || response.status === 429) {
                const retryAfterSec = parseInt(response.headers.get('retry-after') || '60', 10);
                const resetEpoch = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000;
                const pauseUntil = resetEpoch > Date.now() ? resetEpoch : Date.now() + retryAfterSec * 1000;
                this._rateLimitPauseUntil = pauseUntil;
                const waitMs = pauseUntil - Date.now();
                console.warn(`[GitHubAPI] Rate limited. Pausing ${Math.round(waitMs / 1000)}s before retry.`);
                if (retries > 0) {
                    await new Promise(res => setTimeout(res, Math.min(waitMs, 60000)));
                    return this.request(endpoint, options, retries - 1, delay * 2);
                }
                throw new Error('GitHub API rate limit exceeded. Please try again later.');
            }

            if (!response.ok) {
                if (response.status === 404) return null; // 404 is valid for checking existence
                if (response.status === 409) throw new Error("409 Conflict");
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`GitHub API Error ${response.status}: ${errorData.message || ''}`);
            }

            // Some requests return empty bodies (like 204 No Content)
            if (response.status === 204) return true;

            return await response.json();
        } catch (error) {
            // Never retry on auth or conflict errors
            const isTerminal = error.message.includes('401') || error.message.includes('409');
            if (retries > 0 && !isTerminal) {
                console.warn(`[GitHubAPI] Retrying ${endpoint} (${retries} left)...`);
                await new Promise(res => setTimeout(res, delay));
                return this.request(endpoint, options, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    // --- Helper: Encode Unicode to Base64 ---
    static encodeBase64Unicode(str) {
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
        return btoa(binString);
    }

    static decodeBase64Unicode(b64) {
        const binString = atob(b64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    // --- Auth Initialization ---
    static async fetchUser() {
        const user = await this.request('/user');
        if (user && user.login) {
            sessionStorage.setItem('github_username', user.login);
            return user;
        }
        throw new Error("Failed to fetch user");
    }

    // --- Git Data API Methods ---

    static async getLatestCommit() {
        // Gets the SHA of the latest commit on the main branch
        const data = await this.request(`/repos/${this.OWNER}/${this.REPO}/git/refs/heads/main`);
        if (!data) return null; // Repository might be empty
        return data.object.sha;
    }

    static async getCommitTree(commitSha) {
        const commit = await this.request(`/repos/${this.OWNER}/${this.REPO}/git/commits/${commitSha}`);
        return commit.tree.sha;
    }

    static async createBlob(content) {
        const payload = {
            content: this.encodeBase64Unicode(content),
            encoding: 'base64'
        };
        const blob = await this.request(`/repos/${this.OWNER}/${this.REPO}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return blob.sha;
    }

    static async createTree(baseTreeSha, treeItems) {
        /**
         * treeItems: [{ path, mode: '100644', type: 'blob', sha (or content) }]
         */
        const payload = {
            base_tree: baseTreeSha,
            tree: treeItems
        };
        const tree = await this.request(`/repos/${this.OWNER}/${this.REPO}/git/trees`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return tree.sha;
    }

    static async createCommit(message, treeSha, parentCommits = []) {
        const payload = {
            message,
            tree: treeSha,
            parents: parentCommits
        };
        const commit = await this.request(`/repos/${this.OWNER}/${this.REPO}/git/commits`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return commit.sha;
    }

    static async updateBranchRef(commitSha) {
        return await this.request(`/repos/${this.OWNER}/${this.REPO}/git/refs/heads/main`, {
            method: 'PATCH',
            body: JSON.stringify({ sha: commitSha, force: false })
        });
    }

    // --- High Level Commit Batcher ---
    /**
     * Files array format: { path: "string", content: "string" or null for delete }
     */
    static async commitBatch(message, files) {
        if (!this.OWNER) await this.fetchUser();

        const latestCommitSha = await this.getLatestCommit();
        if (!latestCommitSha) throw new Error("Empty repository or no main branch");

        const baseTreeSha = await this.getCommitTree(latestCommitSha);

        const treeItems = [];
        for (const file of files) {
            if (file.content === null) {
                // Deletion: Git tree API removes a file if sha is null
                treeItems.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: null
                });
            } else {
                // Create blob for new/updated content
                const blobSha = await this.createBlob(file.content);
                treeItems.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: blobSha
                });
            }
        }

        const newTreeSha = await this.createTree(baseTreeSha, treeItems);
        const newCommitSha = await this.createCommit(message, newTreeSha, [latestCommitSha]);
        await this.updateBranchRef(newCommitSha);

        return newCommitSha;
    }


    // --- Delta Compare Endpoint ---
    static async compareCommits(baseSha, headSha) {
        return await this.request(`/repos/${this.OWNER}/${this.REPO}/compare/${baseSha}...${headSha}`);
    }

    // --- Fetch Raw File ---
    static async getFileContent(path) {
        if (!this.OWNER) await this.fetchUser();
        const data = await this.request(`/repos/${this.OWNER}/${this.REPO}/contents/${path}`);
        if (!data || !data.content) return null;
        return this.decodeBase64Unicode(data.content);
    }
}
