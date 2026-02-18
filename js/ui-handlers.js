// js/ui-handlers.js
// Handlers for sidebar and header buttons

import { supabase } from './supabase-client.js';
import {
    activeNoteId, notes, folders, renderNoteChips, loadActiveNote,
    showFormattingIndicator, setActiveFolder, setActiveNote, saveCurrentNote,
    loadFolders, loadNotes, activeFolderId
} from './editor.js';
import { openModal, closeModal } from './modals.js';

export function setupUIListeners(userId) {
    // --- SIDEBAR BUTTONS ---
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => openModal('newNoteModal'));
    }

    // --- NEW NOTE MODAL ---
    const createNoteBtn = document.getElementById('createNewNote');
    if (createNoteBtn) {
        createNoteBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('newNoteName');
            const name = nameInput.value.trim();
            if (name) {
                const folderId = activeFolderId; // Simplified for now, or use dropdown logic
                const { data, error } = await supabase
                    .from('notes')
                    .insert([{
                        title: name,
                        folder_id: folderId,
                        content: '',
                        user_id: userId,
                        is_pinned: false
                    }])
                    .select()
                    .single();

                if (!error) {
                    notes.unshift(data);
                    setActiveNote(data.id);
                    renderNoteChips();
                    loadActiveNote();
                    closeModal(document.getElementById('newNoteModal'));
                    showFormattingIndicator('Note created!');
                }
            }
        });
    }

    // --- PIN NOTE ---
    const pinBtn = document.getElementById('pinBtn');
    if (pinBtn) {
        pinBtn.addEventListener('click', async () => {
            if (!activeNoteId) return;
            const note = notes.find(n => n.id === activeNoteId);
            if (note) {
                const newStatus = !note.is_pinned;
                const { error } = await supabase
                    .from('notes')
                    .update({ is_pinned: newStatus })
                    .eq('id', activeNoteId);

                if (error) {
                    showFormattingIndicator('Error pinning note', 'error');
                    return;
                }
                note.is_pinned = newStatus;
                renderNoteChips();
                showFormattingIndicator(note.is_pinned ? 'Note pinned' : 'Note unpinned');
            }
        });
    }

    // --- DELETE NOTE ---
    const deleteBtn = document.getElementById('deleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (activeNoteId) openModal('confirmModal');
        });
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const idToDelete = window.contextMenuNoteId || activeNoteId;
            if (!idToDelete) return;

            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', idToDelete);

            if (error) {
                showFormattingIndicator('Error deleting note', 'error');
                return;
            }

            const index = notes.findIndex(n => n.id === idToDelete);
            if (index > -1) notes.splice(index, 1);

            if (activeNoteId === idToDelete) {
                const folderNotes = notes.filter(n => n.folder_id === activeFolderId);
                setActiveNote(folderNotes.length > 0 ? folderNotes[0].id : null);
            }

            renderNoteChips();
            loadActiveNote();
            closeModal(document.getElementById('confirmModal'));
            showFormattingIndicator('Note deleted!');
        });
    }

    // --- FOLDERS ---
    const manageFoldersBtn = document.getElementById('manageFoldersBtn');
    const createFolderBtn = document.getElementById('createFolderBtn');
    if (manageFoldersBtn) {
        manageFoldersBtn.addEventListener('click', () => {
            renderFolderList(userId);
            openModal('manageFoldersModal');
        });
    }
    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('newFolderName');
            const name = nameInput.value.trim();
            if (!name) return;

            const { data, error } = await supabase
                .from('folders')
                .insert([{ name: name, user_id: userId }])
                .select()
                .single();

            if (error) {
                showFormattingIndicator('Error creating folder', 'error');
                return;
            }

            folders.push(data);
            nameInput.value = '';
            renderFolderList(userId);
            showFormattingIndicator('Folder created!');
        });
    }

    // --- RENAME NOTE ---
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');
    if (confirmRenameBtn) {
        confirmRenameBtn.addEventListener('click', async () => {
            const input = document.getElementById('renameNoteInput');
            const newName = input.value.trim();
            const noteId = window.contextMenuNoteId || activeNoteId;
            if (newName && noteId) {
                const { error } = await supabase
                    .from('notes')
                    .update({ title: newName })
                    .eq('id', noteId);

                if (error) {
                    showFormattingIndicator('Error renaming', 'error');
                    return;
                }

                const note = notes.find(n => n.id === noteId);
                if (note) note.title = newName;
                renderNoteChips();
                closeModal(document.getElementById('renameNoteModal'));
                showFormattingIndicator('Note renamed');
            }
        });
    }

    // --- SHARE ---
    const shareBtn = document.getElementById('shareBtn');
    const shareToggle = document.getElementById('shareToggle');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (!activeNoteId) return;
            const note = notes.find(n => n.id === activeNoteId);
            if (!note) return;

            const shareLinkSection = document.getElementById('shareLinkSection');
            const sharePrivateMsg = document.getElementById('sharePrivateMsg');
            const shareLinkInput = document.getElementById('shareLinkInput');

            if (note.is_public) {
                if (shareToggle) shareToggle.classList.add('public');
                if (shareLinkSection) shareLinkSection.classList.add('visible');
                if (sharePrivateMsg) sharePrivateMsg.classList.remove('visible');
                if (shareLinkInput) shareLinkInput.value = `${window.location.origin}/public/${note.id}`;
            } else {
                if (shareToggle) shareToggle.classList.remove('public');
                if (shareLinkSection) shareLinkSection.classList.remove('visible');
                if (sharePrivateMsg) sharePrivateMsg.classList.add('visible');
            }
            openModal('shareModal');
        });
    }

    if (shareToggle) {
        shareToggle.addEventListener('click', async () => {
            if (!activeNoteId) return;
            if (!shareToggle.classList) return;
            const isNowPublic = !shareToggle.classList.contains('public');
            const shareLinkSection = document.getElementById('shareLinkSection');
            const sharePrivateMsg = document.getElementById('sharePrivateMsg');
            const shareLinkInput = document.getElementById('shareLinkInput');

            const updates = { is_public: isNowPublic };
            if (isNowPublic) {
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + 24);
                updates.public_expires_at = expiry.toISOString();
            } else {
                updates.public_expires_at = null;
            }

            const { error } = await supabase
                .from('notes')
                .update(updates)
                .eq('id', activeNoteId);

            if (error) {
                showFormattingIndicator('Error updating share settings', 'error');
                return;
            }

            const note = notes.find(n => n.id === activeNoteId);
            if (note) {
                note.is_public = isNowPublic;
                note.public_expires_at = updates.public_expires_at;
            }

            if (isNowPublic) {
                shareToggle.classList.add('public');
                if (shareLinkSection) shareLinkSection.classList.add('visible');
                if (sharePrivateMsg) sharePrivateMsg.classList.remove('visible');
                if (shareLinkInput) shareLinkInput.value = `${window.location.origin}/public/${activeNoteId}`;
            } else {
                shareToggle.classList.remove('public');
                if (shareLinkSection) shareLinkSection.classList.remove('visible');
                if (sharePrivateMsg) sharePrivateMsg.classList.add('visible');
            }
        });
    }
}

export function renderFolderList(userId) {
    const folderList = document.getElementById('folderList');
    if (!folderList) return;
    folderList.innerHTML = '';
    folders.forEach(folder => {
        const item = document.createElement('div');
        item.className = `folder-item ${folder.id === activeFolderId ? 'active' : ''}`;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            if (activeNoteId) saveCurrentNote();
            setActiveFolder(folder.id);
            renderNoteChips();
            loadActiveNote();
            closeModal(document.getElementById('manageFoldersModal'));
        };

        const actions = document.createElement('div');
        actions.className = 'folder-actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'folder-action-btn';
        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Delete folder "${folder.name}"? Notes will be orphaned.`)) {
                const { error } = await supabase
                    .from('folders')
                    .delete()
                    .eq('id', folder.id);
                if (!error) {
                    const idx = folders.findIndex(f => f.id === folder.id);
                    if (idx > -1) folders.splice(idx, 1);
                    if (activeFolderId === folder.id) setActiveFolder(folders[0]?.id || null);
                    renderFolderList(userId);
                    renderNoteChips();
                    loadActiveNote();
                }
            }
        };
        actions.appendChild(delBtn);
        item.appendChild(nameDiv);
        item.appendChild(actions);
        folderList.appendChild(item);
    });
}
