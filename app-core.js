// app-core.js
import { supabase, restoreSession } from './js/supabase-client.js';
import { showToast } from './js/utils.js';
import { ModalManager } from './js/modalManager.js';

// DOM Elements
export const writingCanvas = document.getElementById('writingCanvas');

class VellumCore {
    constructor() {
        this.notes = [];
        this.folders = [];
        this.currentNoteId = null;
        this.currentFolderId = null;
        this.contextNoteId = null;
        this.user = null;
        this.initialized = false;
        this.saveTimeout = null;
    }

    async init() {
        const hasSession = await restoreSession();
        if (!hasSession) {
            window.location.href = '/login';
            return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            window.location.href = '/login';
            return;
        }

        this.user = user;

        await Promise.all([
            this.loadFolders(),
            this.loadNotes()
        ]);

        this.initialized = true;
        this.setupEventListeners();
        this.renderFolders();
        this.renderNotes();

        const urlParams = new URLSearchParams(window.location.search);
        const noteId = urlParams.get('note');
        if (noteId) {
            this.selectNote(noteId);
        } else if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.showEmptyState();
        }
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.onclick = () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('vellum_theme', newTheme);
                this.updateThemeIcon(newTheme);
            };
            this.updateThemeIcon(document.documentElement.getAttribute('data-theme') || 'light');
        }

        if (writingCanvas) {
            writingCanvas.addEventListener('input', () => this.debouncedSave());
        }

        document.getElementById('addNoteBtn')?.addEventListener('click', () => this.createNewNote());
        document.getElementById('pinBtn')?.addEventListener('click', () => this.togglePin(this.currentNoteId));
        document.getElementById('manageFoldersBtn')?.addEventListener('click', () => this.openManageFolders());
        document.getElementById('deleteBtn')?.addEventListener('click', () => this.confirmDeleteNote());
        document.getElementById('shareBtn')?.addEventListener('click', () => this.openShareModal());
        document.getElementById('userProfileBtn')?.addEventListener('click', () => this.openUserProfile());
        document.getElementById('searchBtn')?.addEventListener('click', () => this.openSearchModal());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.openExportModal());
        document.getElementById('createNoteFromEmpty')?.addEventListener('click', () => this.createNewNote());

        document.getElementById('focusBtn')?.addEventListener('click', () => this.toggleFocusMode());
        document.getElementById('restoreBtn')?.addEventListener('click', () => this.toggleFocusMode());

        // Context Menu Actions
        document.getElementById('ctxRename')?.addEventListener('click', () => this.openRenameModal());
        document.getElementById('ctxPin')?.addEventListener('click', () => this.togglePin(this.contextNoteId));
        document.getElementById('ctxDelete')?.addEventListener('click', () => this.deleteNote(this.contextNoteId));
        document.getElementById('moveToFolderItem')?.addEventListener('click', () => this.openMoveModal());

        window.addEventListener('contextmenu', (e) => this.handleGlobalContextMenu(e));
        document.addEventListener('click', () => this.closeContextMenu());
    }

    toggleFocusMode() {
        const workspace = document.querySelector('.workspace');
        const sidebar = document.getElementById('sidebar');
        const topBar = document.getElementById('topBar');
        const restoreBtn = document.getElementById('restoreBtn');

        workspace?.classList.toggle('focus-mode');
        sidebar?.classList.toggle('hidden');
        topBar?.classList.toggle('hidden');
        restoreBtn?.classList.toggle('visible');
    }

    updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    async loadFolders() {
        const { data, error } = await supabase.from('folders').select('*').order('name');
        if (!error) this.folders = data || [];
        this.renderFolders();
    }

    async loadNotes() {
        const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
        if (!error) this.notes = data || [];
        this.renderNotes();
    }

    async createNewNote() {
        const note = await this.createNote('Untitled Note', '# Untitled Note\n\nStart writing...');
        if (note) showToast('New note created', 'success');
    }

    async createNote(title = 'Untitled', content = '', folderId = null) {
        const { data, error } = await supabase
            .from('notes')
            .insert([{ title, content, folder_id: folderId }])
            .select().single();

        if (error) {
            showToast("Failed to create note: " + error.message, "error");
            return null;
        }

        this.notes.unshift(data);
        this.renderNotes();
        this.selectNote(data.id);
        return data;
    }

    debouncedSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
    }

    async saveCurrentNote() {
        if (!this.currentNoteId || !writingCanvas) return;
        const content = writingCanvas.value;
        const title = this.extractTitle(content);

        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (note && note.content === content && note.title === title) return;

        const { error } = await supabase
            .from('notes')
            .update({ title, content, updated_at: new Date().toISOString() })
            .eq('id', this.currentNoteId);

        if (!error) {
            if (note) {
                note.title = title;
                note.content = content;
            }
            this.renderNotes();
        }
    }

    extractTitle(content) {
        const lines = content.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('# ')) return line.replace('# ', '').substring(0, 50);
            if (line.length > 0) return line.substring(0, 50);
        }
        return 'Untitled';
    }

    async deleteNote(id) {
        if (!id) return;
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) {
            showToast("Delete failed: " + error.message, "error");
            return false;
        }

        this.notes = this.notes.filter(n => n.id !== id);
        if (this.currentNoteId === id) {
            this.currentNoteId = null;
            if (this.notes.length > 0) {
                this.selectNote(this.notes[0].id);
            } else {
                this.showEmptyState();
            }
        }
        this.renderNotes();
        showToast('Note deleted', 'success');
        return true;
    }

    confirmDeleteNote() {
        if (!this.currentNoteId) return;
        ModalManager.open('deleteNote', {
            onConfirm: () => this.deleteNote(this.currentNoteId)
        });
    }

    async togglePin(id) {
        if (!id) return;
        const note = this.notes.find(n => n.id === id);
        if (!note) return;

        const newPinnedStatus = !note.is_pinned;
        const { error } = await supabase.from('notes').update({ is_pinned: newPinnedStatus }).eq('id', id);

        if (!error) {
            note.is_pinned = newPinnedStatus;
            this.renderNotes();
            if (id === this.currentNoteId) this.updatePinButton(newPinnedStatus);
            showToast(newPinnedStatus ? 'Note pinned' : 'Note unpinned', 'success');
        }
    }

    updatePinButton(isPinned) {
        document.getElementById('pinBtn')?.classList.toggle('active', isPinned);
    }

    renderFolders() {
        const noteChips = document.getElementById('noteChips');
        if (!noteChips) return;
        // In this hybrid UI, maybe we show folders as chips at the top?
        // But the requirements say "All Notes" chip too.
        // Let's stick to showing notes for now and use a modal for folders.
    }

    renderNotes() {
        const noteChips = document.getElementById('noteChips');
        if (!noteChips) return;

        noteChips.innerHTML = '';

        const filteredNotes = this.currentFolderId
            ? this.notes.filter(n => n.folder_id === this.currentFolderId)
            : this.notes;

        const sortedNotes = [...filteredNotes].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

        sortedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = `chip ${this.currentNoteId === note.id ? 'active' : ''} ${note.is_pinned ? 'pinned' : ''}`;
            noteEl.innerHTML = `
                <div class="chip-content">
                    <i class="fa-solid ${note.is_pinned ? 'fa-thumbtack' : 'fa-file-lines'}"></i>
                    <span>${note.title || 'Untitled'}</span>
                </div>
            `;
            noteEl.onclick = () => this.selectNote(note.id);
            noteEl.oncontextmenu = (e) => this.handleNoteContextMenu(e, note.id);
            noteChips.appendChild(noteEl);
        });

        const emptyState = document.getElementById('emptyState');
        const editorContainer = document.getElementById('editorContainer');

        if (sortedNotes.length === 0) {
            emptyState?.classList.remove('hidden');
            editorContainer?.classList.add('hidden');
        } else {
            emptyState?.classList.add('hidden');
            editorContainer?.classList.remove('hidden');
        }
    }

    selectNote(id) {
        if (!id) return;
        this.currentNoteId = id;
        const note = this.notes.find(n => n.id === id);
        if (note) {
            this.loadNoteIntoEditor(note);
            this.updatePinButton(note.is_pinned);
            this.renderNotes();
            const url = new URL(window.location);
            url.searchParams.set('note', id);
            window.history.pushState({}, '', url);
        }
    }

    loadNoteIntoEditor(note) {
        if (writingCanvas) {
            writingCanvas.value = note.content || '';
            writingCanvas.dispatchEvent(new Event('input'));
        }
    }

    showEmptyState() {
        document.getElementById('emptyState')?.classList.remove('hidden');
        document.getElementById('editorContainer')?.classList.add('hidden');
    }

    handleNoteContextMenu(e, id) {
        e.preventDefault();
        e.stopPropagation();
        this.contextNoteId = id;
        const menu = document.getElementById('noteContextMenu');
        if (menu) {
            menu.style.top = `${e.clientY}px`;
            menu.style.left = `${e.clientX}px`;
            menu.classList.add('show');

            const note = this.notes.find(n => n.id === id);
            const pinItem = document.getElementById('ctxPin');
            if (pinItem && note) {
                pinItem.innerHTML = note.is_pinned ? '<i class="fas fa-thumbtack"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
            }
        }
    }

    handleGlobalContextMenu(e) {
        // No global context menu for now
    }

    closeContextMenu() {
        document.getElementById('noteContextMenu')?.classList.remove('show');
    }

    openManageFolders() {
        ModalManager.open('manageFolders', {
            onOpen: () => this.initManageFoldersModal()
        });
    }

    initManageFoldersModal() {
        this.renderModalFolders();
        document.getElementById('createFolderBtn')?.onclick = () => this.handleCreateFolder();
    }

    async handleCreateFolder() {
        const input = document.getElementById('newFolderName');
        const name = input.value.trim();
        if (!name) return;
        const { data, error } = await supabase.from('folders').insert([{ name }]).select().single();
        if (!error) {
            this.folders.push(data);
            input.value = '';
            this.renderModalFolders();
            showToast('Folder created', 'success');
        }
    }

    renderModalFolders() {
        const grid = document.getElementById('folderChipsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        this.folders.forEach(folder => {
            const el = document.createElement('div');
            el.className = 'folder-chip';
            el.innerHTML = `<span class="folder-chip-name">${folder.name}</span><div class="delete-btn"><i class="fas fa-times"></i></div>`;
            el.onclick = () => {
                this.currentFolderId = folder.id;
                ModalManager.close();
                this.renderNotes();
            };
            el.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteFolder(folder.id);
            };
            grid.appendChild(el);
        });
    }

    async deleteFolder(id) {
        const { error } = await supabase.from('folders').delete().eq('id', id);
        if (!error) {
            this.folders = this.folders.filter(f => f.id !== id);
            this.renderModalFolders();
            showToast('Folder deleted', 'success');
        }
    }

    openRenameModal() {
        const note = this.notes.find(n => n.id === this.contextNoteId);
        if (!note) return;
        ModalManager.open('renameNote', {
            title: note.title,
            onConfirm: () => {
                const newTitle = document.getElementById('renameNoteInput').value;
                this.updateNote(this.contextNoteId, { title: newTitle });
                this.renderNotes();
            }
        });
    }

    openMoveModal() {
        const note = this.notes.find(n => n.id === this.contextNoteId);
        if (!note) return;
        ModalManager.open('moveNote', {
            noteTitle: note.title,
            onOpen: () => {
                const select = document.getElementById('moveFolderSelectOptions');
                if (!select) return;
                select.innerHTML = '<div class="select-option" data-id="">Uncategorized</div>';
                this.folders.forEach(f => {
                    select.innerHTML += `<div class="select-option" data-id="${f.id}">${f.name}</div>`;
                });
                select.onclick = (e) => {
                    const opt = e.target.closest('.select-option');
                    if (opt) {
                        this.updateNote(this.contextNoteId, { folder_id: opt.dataset.id || null });
                        ModalManager.close();
                        this.renderNotes();
                        showToast('Note moved', 'success');
                    }
                };
            }
        });
    }

    openUserProfile() {
        ModalManager.open('userProfile', {
            name: this.user.email.split('@')[0],
            email: this.user.email,
            onOpen: () => {
                document.getElementById('logoutBtn').onclick = () => this.logout();
            }
        });
    }

    async logout() {
        await supabase.auth.signOut();
        sessionStorage.removeItem('vellum_session');
        sessionStorage.removeItem('vellum_login_time');
        window.location.href = '/login';
    }

    openSearchModal() {
        ModalManager.open('searchNotes', {
            onOpen: () => {
                const input = document.getElementById('searchInput');
                const results = document.getElementById('searchResults');
                input.oninput = () => {
                    const query = input.value.toLowerCase();
                    const filtered = this.notes.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
                    results.innerHTML = '';
                    filtered.forEach(n => {
                        const el = document.createElement('div');
                        el.className = 'search-result-card';
                        el.innerHTML = `<div class="search-result-name">${n.title}</div>`;
                        el.onclick = () => { this.selectNote(n.id); ModalManager.close(); };
                        results.appendChild(el);
                    });
                };
            }
        });
    }

    openShareModal() {
        ModalManager.open('shareNote');
    }

    openExportModal() {
        ModalManager.open('exportNote', { fileName: this.extractTitle(writingCanvas.value) });
    }
}

export const core = new VellumCore();
export const saveCurrentNote = () => core.saveCurrentNote();

if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => core.init());
    } else {
        core.init();
    }
}
