import { InteractiveBlockPlayer, type InteractiveMetadata } from '@/components/interactive-learning';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function PreviewDialog({
    open,
    metadata,
    onOpenChange,
}: {
    open: boolean;
    metadata: InteractiveMetadata;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Preview siswa</DialogTitle>
                </DialogHeader>
                <InteractiveBlockPlayer metadata={metadata as unknown as Record<string, unknown>} />
            </DialogContent>
        </Dialog>
    );
}
