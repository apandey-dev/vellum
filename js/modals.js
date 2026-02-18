// js/modals.js
// Modal handling and stack management

export let modalStack = [];

export function pushToModalStack(modal) {
    if (!modal) return;
    modalStack.push(modal);
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('show');
    pushToModalStack(modal);

    // Focus first input if any
    const firstInput = modal.querySelector('input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

export function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    const index = modalStack.indexOf(modal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }

    // Special cleanup for specific modals
    if (modal.id === 'confirmFolderDeleteModal') {
        delete modal.dataset.pendingFolderId;
    }
    if (modal.id === 'moveNoteModal' || modal.id === 'renameNoteModal' || modal.id === 'confirmModal') {
        window.contextMenuNoteId = null;
    }
}

export function closeTopModal() {
    if (modalStack.length > 0) {
        const topModal = modalStack.pop();
        if (topModal) {
            topModal.classList.remove('show');
            // Cleanup
            if (topModal.id === 'confirmFolderDeleteModal') {
                delete topModal.dataset.pendingFolderId;
            }
            if (topModal.id === 'moveNoteModal' || topModal.id === 'renameNoteModal' || topModal.id === 'confirmModal') {
                window.contextMenuNoteId = null;
            }
        }
    }
}

export function setupModalListeners() {
    // ESC to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTopModal();
        }
    });

    // Outside click to close
    window.addEventListener('click', (e) => {
        if (!e.target || !e.target.classList) return;
        if (typeof e.target.classList.contains === 'function' &&
            (e.target.classList.contains('form-modal') || e.target.classList.contains('confirm-modal'))) {
            closeModal(e.target);
        }
    });

    // Close buttons (using Event Delegation for robustness)
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.form-btn.secondary, .confirm-btn.cancel, [id^="close"]');
        if (closeBtn) {
            const modal = closeBtn.closest('.form-modal, .confirm-modal');
            if (modal) closeModal(modal);
        }
    });
}

// Attach to window for global access
window.openModal = openModal;
window.closeModal = closeModal;
window.closeTopModal = closeTopModal;
window.pushToModalStack = pushToModalStack;
