import { ConfirmationDialogPayload } from '@/components/confirmation-dialog-host';

export function confirmDelete(message: string, onConfirm: () => void) {
    confirmAction({
        title: 'Hapus data?',
        message,
        description: 'Data yang sudah dihapus tidak dapat dikembalikan.',
        confirmLabel: 'Hapus',
        cancelLabel: 'Batal',
        tone: 'danger',
        onConfirm,
    });
}

export function confirmAction(payload: ConfirmationDialogPayload) {
    window.dispatchEvent(new CustomEvent('platform:confirm', { detail: payload }));
}
