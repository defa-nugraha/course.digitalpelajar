import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';

export function RequiredMark() {
    return (
        <span aria-hidden="true" className="text-red-600">
            *
        </span>
    );
}

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
    return (
        <Label>
            <span className="inline-flex items-center gap-1">
                {children}
                {required && <RequiredMark />}
            </span>
        </Label>
    );
}

export function FormField({
    label,
    required = false,
    error,
    children,
}: {
    label: ReactNode;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}
