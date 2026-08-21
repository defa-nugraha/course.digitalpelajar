import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ConfirmationDialogPayload {
    title?: string;
    message: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
    onConfirm: () => void;
}

declare global {
    interface WindowEventMap {
        'platform:confirm': CustomEvent<ConfirmationDialogPayload>;
    }
}

export function ConfirmationDialogHost() {
    const [payload, setPayload] = useState<ConfirmationDialogPayload | null>(null);
    const open = Boolean(payload);
    const isDanger = payload?.tone !== 'default';

    useEffect(() => {
        const handleConfirmRequest = (event: WindowEventMap['platform:confirm']) => {
            setPayload(event.detail);
        };

        window.addEventListener('platform:confirm', handleConfirmRequest);

        return () => window.removeEventListener('platform:confirm', handleConfirmRequest);
    }, []);

    const close = () => setPayload(null);
    const confirm = () => {
        const callback = payload?.onConfirm;
        close();
        callback?.();
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
            <DialogContent className="max-w-md rounded-3xl border-slate-200 bg-white p-0 shadow-2xl">
                <div className="p-6">
                    <DialogHeader className="text-left">
                        <div
                            className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${
                                isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}
                        >
                            <AlertTriangle className="size-6" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-950">{payload?.title ?? 'Konfirmasi tindakan'}</DialogTitle>
                        <DialogDescription className="pt-2 text-sm leading-6 text-slate-600">{payload?.message}</DialogDescription>
                    </DialogHeader>

                    {payload?.description && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{payload.description}</p>}

                    <DialogFooter className="mt-6 gap-2 sm:space-x-0">
                        <Button type="button" variant="outline" onClick={close}>
                            {payload?.cancelLabel ?? 'Batal'}
                        </Button>
                        <Button type="button" onClick={confirm} className={isDanger ? 'bg-red-600 text-white hover:bg-red-700' : undefined}>
                            {payload?.confirmLabel ?? 'Lanjutkan'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
