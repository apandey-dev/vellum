/**
 * js/core.js
 * Central application logic for Vellum.
 */
import { supabase, restoreSession } from './supabase-client.js';
import { showToast } from './utils.js';
import { modalManager } from './modalManager.js';

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
        await Promise.all([this.loadFolders(), this.loadNotes()]);
        this.initialized = true;
        this.setupEventListeners();
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

        document.getElementById('ctxRename')?.addEventListener('click', () => this.openRenameModal());
        document.getElementById('ctxPin')?.addEventListener('click', () => this.togglePin(this.contextNoteId));
        document.getElementById('ctxDelete')?.addEventListener('click', () => this.deleteNote(this.contextNoteId));
        document.getElementById('moveToFolderItem')?.addEventListener('click', () => this.openMoveModal());

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
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = theme === 'light' ? 'M' : 'S';
    }

    async loadFolders() {
        const { data, error } = await supabase.from('folders').select('*').order('name');
        if (!error) this.folders = data || [];
    }

    async loadNotes() {
        const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
        if (!error) this.notes = data || [];
    }

    async createNewNote() {
        const note = await this.createNote('Untitled Note', '');
        if (note) showToast('New note created', 'success');
    }

    async createNote(title = 'Untitled Note', content = '', folderId = null) {
        const { data, error } = await supabase.from('notes').insert([{ title, content, folder_id: folderId }]).select().single();
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

    async updateNote(id, updates) {
        if (!id) return false;
        const { error } = await supabase.from('notes').update(updates).eq('id', id);
        if (error) {
            showToast("Update failed: " + error.message, "error");
            return false;
        }
        const note = this.notes.find(n => n.id === id);
        if (note) {
            Object.assign(note, updates);
            this.renderNotes();
        }
        return true;
    }

    async saveCurrentNote() {
        if (!this.currentNoteId || !writingCanvas) return;
        const content = writingCanvas.value;
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (note && note.content === content) return;

        const { error } = await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', this.currentNoteId);
        if (!error && note) note.content = content;
    }

    async deleteNote(id) {
        if (!id) return false;
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) {
            showToast("Delete failed: " + error.message, "error");
            return false;
        }
        this.notes = this.notes.filter(n => n.id !== id);
        if (this.currentNoteId === id) {
            this.currentNoteId = null;
            if (this.notes.length > 0) this.selectNote(this.notes[0].id);
            else this.showEmptyState();
        }
        this.renderNotes();
        showToast('Note deleted', 'success');
        return true;
    }

    confirmDeleteNote() {
        if (!this.currentNoteId) return;
        modalManager.open('deleteNote', { onConfirm: () => this.deleteNote(this.currentNoteId) });
    }

    async togglePin(id) {
        if (!id) return;
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        const newPinnedStatus = !note.is_pinned;
        const success = await this.updateNote(id, { is_pinned: newPinnedStatus });
        if (success) {
            if (id === this.currentNoteId) this.updatePinButton(newPinnedStatus);
            showToast(newPinnedStatus ? 'Note pinned' : 'Note unpinned', 'success');
        }
    }

    updatePinButton(isPinned) {
        document.getElementById('pinBtn')?.classList.toggle('active', isPinned);
    }

    renderNotes() {
        const noteChips = document.getElementById('noteChips');
        if (!noteChips) return;
        noteChips.innerHTML = '';
        const filteredNotes = this.currentFolderId ? this.notes.filter(n => n.folder_id === this.currentFolderId) : this.notes;
        const sortedNotes = [...filteredNotes].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

        sortedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = `chip ${this.currentNoteId === note.id ? 'active' : ''} ${note.is_pinned ? 'pinned' : ''}`;
            noteEl.innerHTML = `<div class="chip-content"><span>${note.title || 'Untitled'}</span></div>`;
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
            if (writingCanvas) {
                writingCanvas.value = note.content || '';
                writingCanvas.dispatchEvent(new Event('input'));
            }
            this.updatePinButton(note.is_pinned);
            this.renderNotes();
            const url = new URL(window.location);
            url.searchParams.set('note', id);
            window.history.pushState({}, '', url);
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
                pinItem.innerHTML = note.is_pinned ? 'Unpin Note' : 'Pin Note';
            }
        }
    }

    closeContextMenu() {
        document.getElementById('noteContextMenu')?.classList.remove('show');
    }

    openManageFolders() {
        modalManager.open('manageFolders', { onOpen: () => this.initManageFoldersModal() });
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

        const allNotesEl = document.createElement('div');
        allNotesEl.className = 'folder-chip all-notes-chip';
        allNotesEl.innerHTML = `<span class="folder-chip-name">All Notes</span>`;
        allNotesEl.onclick = () => { this.currentFolderId = null; modalManager.close(); this.renderNotes(); };
        grid.appendChild(allNotesEl);

        this.folders.forEach(folder => {
            const el = document.createElement('div');
            el.className = 'folder-chip';
            el.innerHTML = `<span class="folder-chip-name">${folder.name}</span><div class="delete-btn">X</div>`;
            el.onclick = () => { this.currentFolderId = folder.id; modalManager.close(); this.renderNotes(); };
            el.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); this.deleteFolder(folder.id); };
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
        modalManager.open('renameNote', {
            title: note.title,
            onConfirm: () => {
                const newTitle = document.getElementById('renameNoteInput').value;
                this.updateNote(this.contextNoteId, { title: newTitle });
            }
        });
    }

    openMoveModal() {
        const note = this.notes.find(n => n.id === this.contextNoteId);
        if (!note) return;
        modalManager.open('moveNote', {
            noteTitle: note.title,
            onOpen: (modalEl) => {
                const select = modalEl.querySelector('#moveFolderSelectOptions');
                select.innerHTML = '<div class="select-option" data-id="">Uncategorized</div>';
                this.folders.forEach(f => { select.innerHTML += `<div class="select-option" data-id="${f.id}">${f.name}</div>`; });
                select.onclick = (e) => {
                    const opt = e.target.closest('.select-option');
                    if (opt) {
                        this.updateNote(this.contextNoteId, { folder_id: opt.dataset.id || null });
                        modalManager.close();
                        showToast('Note moved', 'success');
                    }
                };
                modalEl.querySelector('#createAndMoveBtn').onclick = async () => {
                    const name = modalEl.querySelector('#moveNewFolderName').value.trim();
                    if (!name) return;
                    const { data, error } = await supabase.from('folders').insert([{ name }]).select().single();
                    if (!error) {
                        this.folders.push(data);
                        await this.updateNote(this.contextNoteId, { folder_id: data.id });
                        modalManager.close();
                        showToast('Folder created and note moved', 'success');
                    }
                };
            }
        });
    }

    openUserProfile() {
        modalManager.open('userProfile', {
            name: this.user.email.split('@')[0],
            email: this.user.email,
            onOpen: (modalEl) => { modalEl.querySelector('#logoutBtn').onclick = () => this.logout(); }
        });
    }

    async logout() {
        await supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '/login';
    }

    openSearchModal() {
        modalManager.open('searchNotes', {
            onOpen: (modalEl) => {
                const input = modalEl.querySelector('#searchInput');
                const results = modalEl.querySelector('#searchResults');
                input.oninput = () => {
                    const query = input.value.toLowerCase();
                    const filtered = this.notes.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
                    results.innerHTML = filtered.length ? '' : '<div class="search-placeholder">No results found</div>';
                    filtered.forEach(n => {
                        const el = document.createElement('div');
                        el.className = 'search-result-card';
                        el.innerHTML = `<div class="search-result-name">${n.title}</div>`;
                        el.onclick = () => { this.selectNote(n.id); modalManager.close(); };
                        results.appendChild(el);
                    });
                };
            }
        });
    }

    async openShareModal() {
        if (!this.currentNoteId) return;
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;
        modalManager.open('shareNote', { onOpen: (modalEl) => this.initShareModal(modalEl, note) });
    }

    initShareModal(modalEl, note) {
        const shareToggle = modalEl.querySelector('#shareToggle');
        const options = shareToggle.querySelectorAll('.toggle-option');
        const shareLinkSection = modalEl.querySelector('#shareLinkSection');
        const sharePrivateMsg = modalEl.querySelector('#sharePrivateMsg');
        const shareLinkInput = modalEl.querySelector('#shareLinkInput');
        const copyLinkBtn = modalEl.querySelector('#copyLinkBtn');

        const updateUI = (isPublic) => {
            shareToggle.className = `share-toggle ${isPublic ? 'public' : ''}`;
            options.forEach(opt => opt.classList.toggle('active', opt.dataset.value === (isPublic ? 'public' : 'private')));
            shareLinkSection.style.display = isPublic ? 'block' : 'none';
            sharePrivateMsg.style.display = isPublic ? 'none' : 'block';
            if (isPublic && note.share_token) shareLinkInput.value = `https://apandey-vellum.vercel.app/share/${note.share_token}`;
        };

        updateUI(note.is_public);
        shareToggle.onclick = async (e) => {
            const opt = e.target.closest('.toggle-option');
            if (!opt) return;
            const newVal = opt.dataset.value === 'public';
            if (newVal === note.is_public) return;
            if (newVal) {
                const { data: token, error } = await supabase.rpc('share_note', { p_note_id: note.id });
                if (!error) { note.is_public = true; note.share_token = token; showToast('Note is now public', 'success'); }
            } else {
                const { error } = await supabase.from('notes').update({ is_public: false, share_token: null, share_expires_at: null }).eq('id', note.id);
                if (!error) { note.is_public = false; note.share_token = null; showToast('Note is now private', 'info'); }
            }
            updateUI(note.is_public);
        };
        copyLinkBtn.onclick = () => { shareLinkInput.select(); document.execCommand('copy'); showToast('Link copied', 'success'); };
    }

    openExportModal() {
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;
        modalManager.open('exportNote', { fileName: note.title, onOpen: (modalEl) => {
            modalEl.querySelectorAll('.export-card').forEach(card => {
                card.onclick = () => {
                    this.exportNote(note, card.dataset.format, modalEl.querySelector('#exportFileName').value || note.title);
                    modalManager.close();
                };
            });
        }});
    }

    exportNote(note, format, fileName) {
        if (format === 'markdown') this.downloadFile(`${fileName}.md`, note.content);
        else if (format === 'text') this.downloadFile(`${fileName}.txt`, note.content.replace(/[#*`]/g, ''));
        else if (format === 'pdf' && window.html2pdf) {
            window.html2pdf().set({ margin: 10, filename: `${fileName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(document.getElementById('previewCanvas')).save();
        }
    }

    downloadFile(filename, text) {
        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        el.setAttribute('download', filename);
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    }
}

export const core = new VellumCore();
export const saveCurrentNote = () => core.saveCurrentNote();

if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => core.init());
    else core.init();
}
