// js/search.js
// Search functionality

import { notes, folders, setActiveFolder, setActiveNote, renderNoteChips, loadActiveNote, saveCurrentNote, activeNoteId } from './editor.js';
import { escapeHtml } from './utils.js';
import { openModal, closeModal } from './modals.js';

export function setupSearchListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchModal = document.getElementById('searchModal');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
            openModal('searchModal');
        });
    }

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
                return;
            }
            const results = notes.filter(note => {
                const nameMatch = note.title.toLowerCase().includes(query);
                const contentText = note.content ? note.content.replace(/<[^>]*>/g, '').toLowerCase() : '';
                const contentMatch = contentText.includes(query);
                return nameMatch || contentMatch;
            });
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-placeholder">No notes found</div>';
                return;
            }
            searchResults.innerHTML = '';
            results.forEach(note => {
                const folder = folders.find(f => f.id === note.folder_id) || { name: 'Unknown' };
                const card = document.createElement('div');
                card.className = 'search-result-card';
                card.innerHTML = `
                    <div class="search-result-name">${escapeHtml(note.title)}</div>
                    <div class="search-result-folder">
                        <i class="fas fa-folder"></i> ${escapeHtml(folder.name)}
                    </div>
                `;
                card.addEventListener('click', () => {
                    if (activeNoteId) saveCurrentNote();
                    setActiveFolder(note.folder_id);
                    setActiveNote(note.id);
                    renderNoteChips();
                    // folder rendering might need to be updated too
                    loadActiveNote();
                    closeModal(searchModal);
                });
                searchResults.appendChild(card);
            });
        });
    }
}
