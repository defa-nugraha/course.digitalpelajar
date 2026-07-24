import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Cari opsi...',
    emptyMessage = 'Tidak ada opsi yang cocok.',
    className,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value) ?? null;
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
    }, [options, query]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const selectOption = (option: SearchableSelectOption) => {
        if (option.disabled) {
            return;
        }

        onChange(option.value);
        setOpen(false);
        setQuery('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
            return;
        }

        if (event.key === 'Enter' && open && filteredOptions.length > 0) {
            event.preventDefault();
            const firstEnabled = filteredOptions.find((option) => !option.disabled);

            if (firstEnabled) {
                selectOption(firstEnabled);
            }
        }
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                disabled={disabled}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm transition outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                value={open ? query : (selectedOption?.label ?? '')}
                onFocus={() => {
                    setOpen(true);
                    setQuery('');
                }}
                onClick={() => {
                    setOpen(true);
                    setQuery('');
                }}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={selectedOption ? searchPlaceholder : placeholder}
            />
            <button
                type="button"
                disabled={disabled}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 disabled:cursor-not-allowed"
                onClick={() => {
                    setOpen((current) => !current);
                    setQuery('');
                    inputRef.current?.focus();
                }}
                aria-label="Buka pilihan"
            >
                <ChevronsUpDown className="size-4" />
            </button>

            {open && !disabled && (
                <div
                    role="listbox"
                    className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 text-sm shadow-xl"
                >
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</div>
                    ) : (
                        filteredOptions.map((option) => {
                            const selected = option.value === value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    disabled={option.disabled}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-between rounded px-3 py-2 text-left text-slate-700 select-none hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
                                        selected && 'bg-blue-50 text-blue-700',
                                    )}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectOption(option)}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {selected && <Check className="size-4 shrink-0 text-blue-700" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
