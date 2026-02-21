/**
 * modalManager.js
 * Centralized modal controller.
 */

class ModalManager {
    constructor() {
        this.stack = [];
        this.container = null;
        this._handleKeydown = this._handleKeydown.bind(this);
        this._ensureContainer();
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
     * Opens a modal.
     * @param {string} id - Unique identifier for the modal.
     * @param {object} options - Modal options.
     * @param {string} options.title - Modal title.
     * @param {string} options.content - Modal body HTML.
     * @param {Array} options.actions - Array of action button objects { text, class, onClick, closeOnClick }.
     * @param {function} options.onClose - Callback when modal closes.
     * @param {function} options.onMount - Callback when modal is added to DOM.
     */
    openModal(id, options) {
        // Prevent background scroll
        document.body.style.overflow = 'hidden';

        const previousFocus = document.activeElement;
        const modalEl = document.createElement('div');
        modalEl.className = 'modal-backdrop';
        modalEl.id = `modal-${id}`;

        // Use a standard box structure for all modals
        modalEl.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title-${id}">
                <button class="modal-close-x" aria-label="Close modal">&times;</button>
                ${options.title ? `<h3 id="modal-title-${id}">${options.title}</h3>` : ''}
                <div class="modal-body">${options.content}</div>
                ${options.actions ? `
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

        // Force reflow for animation
        modalEl.offsetHeight;
        modalEl.classList.add('show');

        const modalState = {
            id,
            element: modalEl,
            options,
            previousFocus
        };

        this.stack.push(modalState);

        // Attach event listeners
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) this.closeModal();
        });

        const closeX = modalEl.querySelector('.modal-close-x');
        if (closeX) {
            closeX.onclick = () => this.closeModal();
        }

        const actionButtons = modalEl.querySelectorAll('.modal-btn');
        actionButtons.forEach(btn => {
            btn.onclick = () => {
                const index = btn.dataset.actionIndex;
                const action = options.actions[index];
                if (action.onClick) action.onClick();
                if (action.closeOnClick !== false) this.closeModal();
            };
        });

        if (this.stack.length === 1) {
            document.addEventListener('keydown', this._handleKeydown);
        }

        if (options.onMount) {
            options.onMount(modalEl);
        }

        this._trapFocus(modalEl);
    }

    closeModal() {
        if (this.stack.length === 0) return;

        const modalState = this.stack.pop();
        const { element, options, previousFocus } = modalState;

        element.classList.remove('show');

        // Cleanup
        setTimeout(() => {
            element.remove();

            if (this.stack.length === 0) {
                document.removeEventListener('keydown', this._handleKeydown);
                document.body.style.overflow = '';
            } else {
                // Focus the previous modal in stack if any
                const topModal = this.stack[this.stack.length - 1];
                this._trapFocus(topModal.element);
            }

            if (options.onClose) {
                options.onClose();
            }

            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
            }
        }, 300); // Match CSS transition
    }

    _handleKeydown(e) {
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    _trapFocus(modalEl) {
        const focusableElements = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modalEl.onkeydown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };

        if (firstFocusable) {
            // Delay slightly for animation and content injection
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }
}

export const modalManager = new ModalManager();
