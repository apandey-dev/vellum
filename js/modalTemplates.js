/**
 * js/modalTemplates.js
 * Generators for modal content.
 */

export const modalTemplates = {
    deleteNote: () => `
        <div class="confirm-icon danger">
            <i class="fas fa-trash-alt"></i>
        </div>
        <p>This will permanently delete the current note. This action cannot be undone.</p>
    `,

    renameNote: (title) => `
        <div class="form-group">
            <label>New Title</label>
            <input type="text" id="renameNoteInput" placeholder="Enter new note title..." value="${title || ''}">
        </div>
    `,

    manageFolders: () => `
        <div class="manage-folders-body">
            <div class="folder-details-panel" id="folderDetailsPanel">
                <div class="folder-detail-placeholder">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a folder to view details</p>
                </div>
            </div>
            <div class="folder-chips-panel">
                <div class="folder-chips-grid" id="folderChipsGrid"></div>
            </div>
        </div>
        <div class="modal-footer-compact">
            <div class="create-folder-form">
                <input type="text" id="newFolderName" class="create-folder-input" placeholder="Enter new folder name..." autocomplete="off">
                <button class="form-btn primary create-folder-btn" id="createFolderBtn">
                    <i class="fas fa-plus"></i> Create
                </button>
            </div>
        </div>
    `,

    shareNote: () => `
        <p class="share-subtitle">Control who can view this note</p>
        <div class="share-toggle-wrapper">
            <div class="share-toggle" id="shareToggle">
                <div class="toggle-option" data-value="private">Private</div>
                <div class="toggle-option" data-value="public">Public</div>
                <div class="toggle-slider"></div>
            </div>
        </div>
        <div class="share-link-section" id="shareLinkSection">
            <label>Public Link (24h)</label>
            <div class="link-input-wrapper">
                <input type="text" id="shareLinkInput" readonly value="">
                <button class="copy-btn" id="copyLinkBtn" data-tooltip="Copy">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <p class="share-info"><i class="fas fa-info-circle"></i> Anyone with this link can view this note for 24 hours.</p>
        </div>
        <div class="share-private-msg" id="sharePrivateMsg">
            <i class="fas fa-lock"></i>
            <p>This note is restricted to you only.</p>
        </div>
    `,

    exportNote: (fileName) => `
        <div class="form-group">
            <label>File Name</label>
            <input type="text" id="exportFileName" placeholder="Enter file name..." value="${fileName || 'note'}">
        </div>
        <div class="export-options-grid">
            <div class="export-card" data-format="pdf">
                <div class="export-card-icon pdf"><i class="fas fa-file-pdf"></i></div>
                <h4>PDF</h4>
                <p>High-quality doc</p>
            </div>
            <div class="export-card" data-format="markdown">
                <div class="export-card-icon markdown"><i class="fas fa-file-alt"></i></div>
                <h4>Markdown</h4>
                <p>.md format</p>
            </div>
            <div class="export-card" data-format="text">
                <div class="export-card-icon text"><i class="fas fa-file"></i></div>
                <h4>Text</h4>
                <p>Plain text</p>
            </div>
        </div>
    `,

    searchNotes: () => `
        <div class="form-group">
            <input type="text" id="searchInput" placeholder="Type to search notes..." autocomplete="off">
        </div>
        <div class="search-results" id="searchResults">
            <div class="search-placeholder">Start typing to search...</div>
        </div>
    `,

    userProfile: (name, email) => `
        <div class="profile-content">
            <div class="profile-pfp"><i class="fas fa-user"></i></div>
            <div class="profile-info">
                <h4>${name || 'User'}</h4>
                <p>${email || ''}</p>
            </div>
        </div>
        <button class="auth-btn logout-btn" id="logoutBtn" style="margin-top: 20px; width: 100%;">
            <i class="fas fa-sign-out-alt"></i> Logout Account
        </button>
    `,

    moveNote: (noteTitle) => `
        <div class="confirm-icon primary"><i class="fas fa-exchange-alt"></i></div>
        <p class="move-note-title">Moving: "<strong>${noteTitle}</strong>"</p>
        <div class="move-content">
            <div class="form-group">
                <label><i class="fas fa-folder-open"></i> Destination Folder</label>
                <div class="custom-select" id="moveFolderSelectWrapper">
                    <div class="select-trigger" id="moveFolderSelectTrigger">
                        <span id="moveSelectedFolderName">Choose folder</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="select-options" id="moveFolderSelectOptions"></div>
                </div>
            </div>
            <div class="divider-h" style="margin: 20px 0;"></div>
            <div class="form-group">
                <label><i class="fas fa-plus-circle"></i> Create & Move to New Folder</label>
                <div class="input-with-btn">
                    <input type="text" id="moveNewFolderName" placeholder="New folder name...">
                    <button class="form-btn primary" id="createAndMoveBtn"><i class="fas fa-plus-circle"></i> Create</button>
                </div>
            </div>
        </div>
    `
};
