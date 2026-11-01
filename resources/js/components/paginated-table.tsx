import { Children, cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode, type TableHTMLAttributes } from 'react';

type TableBodyProps = { children?: ReactNode };
type PaginatedTableProps = TableHTMLAttributes<HTMLTableElement> & { children: ReactNode };

export default function PaginatedTable({ children, className, ...tableProps }: PaginatedTableProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const tableChildren = Children.toArray(children);
    const bodyIndex = tableChildren.findIndex((child) => isValidElement(child) && child.type === 'tbody');
    const body = bodyIndex >= 0 ? (tableChildren[bodyIndex] as ReactElement<TableBodyProps>) : null;
    const rows = body ? Children.toArray(body.props.children) : [];
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const startIndex = rows.length === 0 ? 0 : (currentPage - 1) * pageSize;
    const visibleRows = rows.slice(startIndex, startIndex + pageSize);

    useEffect(() => setPage(1), [rows.length, pageSize]);
    useEffect(() => { if (page !== currentPage) setPage(currentPage); }, [currentPage, page]);

    const paginatedChildren = body
        ? tableChildren.map((child, index) => index === bodyIndex ? cloneElement(body, { children: visibleRows }) : child)
        : tableChildren;

    return (
        <div className="w-full space-y-3">
            <table className={className} {...tableProps}>{paginatedChildren}</table>
            <nav aria-label="Navigasi halaman tabel" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                    <span>Menampilkan <strong>{rows.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, rows.length)}</strong> dari <strong>{rows.length}</strong> data</span>
                    <label className="inline-flex items-center gap-2">
                        <span>Baris</span>
                        <select aria-label="Jumlah baris per halaman" className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                        </select>
                        <span>per halaman</span>
                    </label>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" aria-label="Halaman sebelumnya" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
                    <span className="min-w-20 px-2 text-center font-semibold tabular-nums">{currentPage} / {pageCount}</span>
                    <button type="button" aria-label="Halaman berikutnya" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
                </div>
            </nav>
        </div>
    );
}
