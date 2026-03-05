// js/core/repoBootstrap.js
import { GitHubAPI } from './githubClient.js';

export class RepoBootstrap {
    static async checkRepositoryExists() {
        if (!GitHubAPI.OWNER) await GitHubAPI.fetchUser();
        const repo = await GitHubAPI.request(`/repos/${GitHubAPI.OWNER}/${GitHubAPI.REPO}`).catch(() => null);
        return repo !== null;
    }

    static async createNotesRepository() {
        if (!GitHubAPI.OWNER) await GitHubAPI.fetchUser();
        // Create as private, initialized with README to set up the default main branch
        return await GitHubAPI.request(`/user/repos`, {
            method: 'POST',
            body: JSON.stringify({
                name: GitHubAPI.REPO,
                description: 'Vellum Notes Auto-Generated Storage',
                private: true,
                auto_init: true
            })
        });
    }

    static async bootstrapRepository() {
        let exists = await this.checkRepositoryExists();
        if (!exists) {
            console.log("Repository missing. Creating...");
            await this.createNotesRepository();
            // Wait for GitHub to initialize the default branch (README commit)
            await new Promise(res => setTimeout(res, 2000));
        }

        // Try reading the index file directly; if 404, we seed it.
        const metaPath = 'metadata/index.json';
        const metaInfo = await GitHubAPI.request(`/repos/${GitHubAPI.OWNER}/${GitHubAPI.REPO}/contents/${metaPath}`).catch(() => null);

        if (!metaInfo) {
            console.log("Seeding initial directory structure...");

            const initialIndex = {
                folders: {
                    personal: { name: "Personal", notes: [] }
                },
                notesIndex: {},
                lastCommitSha: null
            };

            const filesToCommit = [
                { path: 'metadata/index.json', content: JSON.stringify(initialIndex, null, 2) },
                { path: 'shared/shared_notes.json', content: '[]' }
            ];

            const newCommitSha = await GitHubAPI.commitBatch("Initialize Vellum Repository Structure", filesToCommit);
            return newCommitSha;
        }

        return null; // Already bootstrapped
    }
}
