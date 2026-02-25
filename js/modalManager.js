/**
 * js/modalManager.js
 * Centralized modal controller.
 */
import { modalTemplates } from './modalTemplates.js';

export class ModalManager {
    constructor() {
        this.stack = [];
        this.container = null;
        this._handleKeydown = this._handleKeydown.bind(this);
    }

    _ensureContainer() {
        this.container = document.getElementById('modal-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'modal-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Opens a modal using a template ID.
     */
    open(templateId, options = {}) {
        const templateFn = modalTemplates[templateId];
        if (!templateFn) {
            console.error(`Template not found: ${templateId}`);
            return;
        }

        const content = templateFn(options.title || options.noteTitle || options.fileName || options.name, options.email);

        let title = '';
        let actions = [];

        switch (templateId) {
            case 'deleteNote':
                title = 'Delete Note';
                actions = [
                    { text: 'Cancel', class: 'secondary' },
                    { text: 'Delete', class: 'danger', onClick: options.onConfirm }
                ];
                break;
            case 'renameNote':
                title = 'Rename Note';
                actions = [
                    { text: 'Cancel', class: 'secondary' },
                    { text: 'Save Changes', class: 'primary', onClick: options.onConfirm }
                ];
                break;
            case 'manageFolders':
                title = 'Manage Folders';
                break;
            case 'moveNote':
                title = 'Move Note';
                break;
            case 'shareNote':
                title = 'Share Note';
                break;
            case 'exportNote':
                title = 'Export Note';
                actions = [{ text: 'Cancel', class: 'secondary' }];
                break;
            case 'searchNotes':
                title = 'Search Notes';
                break;
            case 'userProfile':
                title = 'User Profile';
                break;
        }

        this.openModal(templateId, {
            title: title,
            content: content,
            actions: actions,
            onMount: options.onOpen || options.onMount,
            onClose: options.onClose
        });
    }

    close() {
        this.closeModal();
    }

    openModal(id, options) {
        this._ensureContainer();
        document.body.style.overflow = 'hidden';

        const previousFocus = document.activeElement;
        const modalEl = document.createElement('div');
        modalEl.className = 'modal-backdrop';
        modalEl.id = `modal-${id}`;

        const boxClass = options.boxClass ? `modal-box ${options.boxClass}` : 'modal-box';

        modalEl.innerHTML = `
            <div class="${boxClass}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${id}">
                <button class="modal-close-x" aria-label="Close modal">&times;</button>
                ${options.title ? `<h3 id="modal-title-${id}">${options.title}</h3>` : ''}
                <div class="modal-body">${options.content}</div>
                ${options.actions && options.actions.length > 0 ? `
                    <div class="modal-actions">
                        ${options.actions.map((action, index) => `
                            <button class="modal-btn ${action.class || 'secondary'}" data-action-index="${index}">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        this.container.appendChild(modalEl);
        modalEl.offsetHeight; // Reflow
        modalEl.classList.add('show');

        this.stack.push({ id, element: modalEl, options, previousFocus });

        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) this.closeModal();
        });

        const closeX = modalEl.querySelector('.modal-close-x');
        if (closeX) closeX.onclick = () => this.closeModal();

        const actionButtons = modalEl.querySelectorAll('.modal-btn');
        actionButtons.forEach(btn => {
            btn.onclick = () => {
                const action = options.actions[btn.dataset.actionIndex];
                if (action.onClick) action.onClick();
                if (action.closeOnClick !== false) this.closeModal();
            };
        });

        if (this.stack.length === 1) document.addEventListener('keydown', this._handleKeydown);
        if (options.onMount) options.onMount(modalEl);
        this._trapFocus(modalEl);
    }

    closeModal() {
        if (this.stack.length === 0) return;
        const { element, options, previousFocus } = this.stack.pop();
        element.classList.remove('show');

        setTimeout(() => {
            element.remove();
            if (this.stack.length === 0) {
                document.removeEventListener('keydown', this._handleKeydown);
                document.body.style.overflow = '';
            } else {
                this._trapFocus(this.stack[this.stack.length - 1].element);
            }
            if (options.onClose) options.onClose();
            if (previousFocus) previousFocus.focus();
        }, 300);
    }

    _handleKeydown(e) {
        if (e.key === 'Escape') this.closeModal();
    }

    _trapFocus(modalEl) {
        const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        modalEl.onkeydown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        setTimeout(() => first.focus(), 100);
    }
}

export const modalManager = new ModalManager();
