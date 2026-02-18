// js/export.js
// Export functionality (PDF, Markdown, Text)

import { notes, activeNoteId, showFormattingIndicator } from './editor.js';
import { openModal, closeModal } from './modals.js';

export function setupExportListeners() {
    const exportBtn = document.getElementById('exportBtn');
    const exportConfirmBtn = document.getElementById('exportConfirmBtn');
    const exportFileNameInput = document.getElementById('exportFileName');
    const exportCards = document.querySelectorAll('.export-card');
    let selectedExportFormat = null;

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!activeNoteId) { showFormattingIndicator('No note to export'); return; }
            const note = notes.find(n => n.id === activeNoteId);
            if (note && exportFileNameInput) exportFileNameInput.value = note.title.replace(/[^\w\s]/gi, '');
            exportCards.forEach(card => card.classList.remove('selected'));
            selectedExportFormat = null;
            if (exportConfirmBtn) exportConfirmBtn.disabled = true;
            openModal('exportModal');
        });
    }

    exportCards.forEach(card => {
        card.addEventListener('click', () => {
            exportCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedExportFormat = card.dataset.format;
            if (exportConfirmBtn) exportConfirmBtn.disabled = false;
        });
    });

    if (exportConfirmBtn) {
        exportConfirmBtn.addEventListener('click', async () => {
            const fileName = exportFileNameInput.value.trim() || 'note';
            closeModal(document.getElementById('exportModal'));
            showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`);
            if (selectedExportFormat === 'pdf') await exportAsPDF(fileName);
            else if (selectedExportFormat === 'markdown') exportAsMarkdown(fileName);
            else if (selectedExportFormat === 'text') exportAsText(fileName);
        });
    }
}

async function exportAsPDF(fileName) {
    const writingCanvas = document.getElementById('writingCanvas');
    const content = writingCanvas.innerHTML;
    localStorage.setItem('mindjournal_print_content', content);
    localStorage.setItem('mindjournal_print_title', fileName);
    const printWindow = window.open('/print', '_blank');
    if (printWindow) {
        printWindow.focus();
        showFormattingIndicator('Opening Print Preview...', 'success');
    } else {
        showFormattingIndicator('Please allow popups to print.', 'error');
    }
}

function exportAsMarkdown(fileName) {
    const writingCanvas = document.getElementById('writingCanvas');
    let content = writingCanvas.innerHTML;
    let markdown = content
        .replace(/<div[^>]*class="horizontal-line"[^>]*>/gi, '\n---\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
}

function exportAsText(fileName) {
    const writingCanvas = document.getElementById('writingCanvas');
    let content = writingCanvas.textContent || writingCanvas.innerText;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
}
