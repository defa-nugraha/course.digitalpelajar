import { RequiredMark } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent } from 'react';

interface FooterLinkItem {
    [key: string]: string;
    label: string;
    href: string;
}

interface FooterColumn {
    [key: string]: string | FooterLinkItem[];
    title: string;
    links: FooterLinkItem[];
}

interface FooterSetting {
    description?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    businessHours?: string | null;
    copyrightText?: string | null;
    linkColumns?: FooterColumn[];
    bottomLinks?: FooterLinkItem[];
    isVisible?: boolean;
    updatedAt?: string | null;
}

interface FooterForm {
    [key: string]: string | boolean | FooterColumn[] | FooterLinkItem[];
    description: string;
    address: string;
    email: string;
    phone: string;
    business_hours: string;
    copyright_text: string;
    is_visible: boolean;
    link_columns: FooterColumn[];
    bottom_links: FooterLinkItem[];
}

const blankLink: FooterLinkItem = { label: '', href: '' };

export default function AdminFooter({ footer }: { footer: FooterSetting }) {
    const form = useForm<FooterForm>({
        description: footer.description ?? '',
        address: footer.address ?? '',
        email: footer.email ?? '',
        phone: footer.phone ?? '',
        business_hours: footer.businessHours ?? '',
        copyright_text: footer.copyrightText ?? '',
        is_visible: footer.isVisible ?? true,
        link_columns: footer.linkColumns?.length ? footer.linkColumns : [{ title: '', links: [{ ...blankLink }] }],
        bottom_links: footer.bottomLinks?.length ? footer.bottomLinks : [{ ...blankLink }],
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch('/admin/footer', { preserveScroll: true });
    };

    return (
        <Shell
            title="Kelola Footer"
            eyebrow="Admin Pusat"
            nav="admin"
            actions={
                <Button asChild variant="outline">
                    <Link href="/" target="_blank">
                        <Eye className="size-4" />
                        Lihat Home
                    </Link>
                </Button>
            }
        >
            <Head title="Kelola Footer" />

            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <div className="space-y-6">
                    <Panel title="Informasi utama footer">
                        <div className="space-y-4">
                            <Field label="Deskripsi perusahaan" error={form.errors.description}>
                                <textarea
                                    className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Alamat" error={form.errors.address}>
                                    <Input value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />
                                </Field>
                                <Field label="Email" error={form.errors.email}>
                                    <Input type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                </Field>
                                <Field label="Telepon / informasi layanan" error={form.errors.phone}>
                                    <Input value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                                </Field>
                                <Field label="Jam operasional" error={form.errors.business_hours}>
                                    <Input
                                        value={form.data.business_hours}
                                        onChange={(event) => form.setData('business_hours', event.target.value)}
                                    />
                                </Field>
                            </div>
                            <Field label="Copyright" error={form.errors.copyright_text}>
                                <Input value={form.data.copyright_text} onChange={(event) => form.setData('copyright_text', event.target.value)} />
                            </Field>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_visible}
                                    onChange={(event) => form.setData('is_visible', event.target.checked)}
                                />
                                Tampilkan footer pada halaman publik <RequiredMark />
                            </label>
                            <InputError message={form.errors.is_visible} />
                        </div>
                    </Panel>

                    <Panel
                        title="Kolom link footer"
                        action={
                            <Button type="button" size="sm" variant="outline" onClick={() => addColumn(form)}>
                                <Plus className="size-4" />
                                Kolom
                            </Button>
                        }
                    >
                        <div className="space-y-4">
                            {form.data.link_columns.map((column, columnIndex) => (
                                <div key={columnIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <Field
                                            className="w-full"
                                            label={`Judul kolom ${columnIndex + 1}`}
                                            error={errorFor(form.errors, `link_columns.${columnIndex}.title`)}
                                        >
                                            <Input
                                                value={column.title}
                                                onChange={(event) => updateColumn(form, columnIndex, { title: event.target.value })}
                                            />
                                        </Field>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Hapus kolom"
                                            onClick={() => removeColumn(form, columnIndex)}
                                        >
                                            <Trash2 className="size-4 text-red-600" />
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {column.links.map((link, linkIndex) => (
                                            <div key={linkIndex} className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                                                <div>
                                                    <Input
                                                        placeholder="Label link"
                                                        value={link.label}
                                                        onChange={(event) =>
                                                            updateColumnLink(form, columnIndex, linkIndex, { label: event.target.value })
                                                        }
                                                    />
                                                    <InputError
                                                        message={errorFor(form.errors, `link_columns.${columnIndex}.links.${linkIndex}.label`)}
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        placeholder="/courses"
                                                        value={link.href}
                                                        onChange={(event) =>
                                                            updateColumnLink(form, columnIndex, linkIndex, { href: event.target.value })
                                                        }
                                                    />
                                                    <InputError
                                                        message={errorFor(form.errors, `link_columns.${columnIndex}.links.${linkIndex}.href`)}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeColumnLink(form, columnIndex, linkIndex)}
                                                >
                                                    Hapus
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        className="mt-3"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => addColumnLink(form, columnIndex)}
                                    >
                                        <Plus className="size-4" />
                                        Link
                                    </Button>
                                </div>
                            ))}
                            {form.data.link_columns.length === 0 && <p className="text-sm text-slate-500">Belum ada kolom link.</p>}
                            <InputError message={form.errors.link_columns} />
                        </div>
                    </Panel>

                    <Panel
                        title="Link bawah footer"
                        action={
                            <Button type="button" size="sm" variant="outline" onClick={() => addBottomLink(form)}>
                                <Plus className="size-4" />
                                Link
                            </Button>
                        }
                    >
                        <div className="space-y-3">
                            {form.data.bottom_links.map((link, index) => (
                                <div key={index} className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                                    <div>
                                        <Input
                                            placeholder="Label link"
                                            value={link.label}
                                            onChange={(event) => updateBottomLink(form, index, { label: event.target.value })}
                                        />
                                        <InputError message={errorFor(form.errors, `bottom_links.${index}.label`)} />
                                    </div>
                                    <div>
                                        <Input
                                            placeholder="/login"
                                            value={link.href}
                                            onChange={(event) => updateBottomLink(form, index, { href: event.target.value })}
                                        />
                                        <InputError message={errorFor(form.errors, `bottom_links.${index}.href`)} />
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeBottomLink(form, index)}>
                                        Hapus
                                    </Button>
                                </div>
                            ))}
                            <InputError message={form.errors.bottom_links} />
                        </div>
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Panduan link">
                        <ul className="space-y-2 text-sm leading-6 text-slate-600">
                            <li>Gunakan path internal seperti /courses atau /learning-paths.</li>
                            <li>Link eksternal boleh memakai https://.</li>
                            <li>Email dan telepon boleh memakai mailto: dan tel:.</li>
                            <li>Link javascript, data, dan vbscript ditolak oleh server.</li>
                        </ul>
                        <p className="mt-4 text-xs leading-5 text-slate-500">
                            Update terakhir: {footer.updatedAt || 'belum ada perubahan tersimpan'}.
                        </p>
                    </Panel>

                    <Button type="submit" className="w-full bg-[#1C7DE8] hover:bg-[#1469c7]" disabled={form.processing}>
                        <Save className="size-4" />
                        Simpan Footer
                    </Button>
                </div>
            </form>
        </Shell>
    );
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function addColumn(form: ReturnType<typeof useForm<FooterForm>>) {
    form.setData('link_columns', [...form.data.link_columns, { title: '', links: [{ ...blankLink }] }]);
}

function updateColumn(form: ReturnType<typeof useForm<FooterForm>>, index: number, patch: Partial<FooterColumn>) {
    form.setData(
        'link_columns',
        form.data.link_columns.map((column, columnIndex) =>
            columnIndex === index
                ? {
                      title: patch.title ?? column.title,
                      links: patch.links ?? column.links,
                  }
                : column,
        ),
    );
}

function removeColumn(form: ReturnType<typeof useForm<FooterForm>>, index: number) {
    form.setData(
        'link_columns',
        form.data.link_columns.filter((_, columnIndex) => columnIndex !== index),
    );
}

function addColumnLink(form: ReturnType<typeof useForm<FooterForm>>, columnIndex: number) {
    form.setData(
        'link_columns',
        form.data.link_columns.map((column, index) => (index === columnIndex ? { ...column, links: [...column.links, { ...blankLink }] } : column)),
    );
}

function updateColumnLink(form: ReturnType<typeof useForm<FooterForm>>, columnIndex: number, linkIndex: number, patch: Partial<FooterLinkItem>) {
    form.setData(
        'link_columns',
        form.data.link_columns.map((column, index) =>
            index === columnIndex
                ? {
                      ...column,
                      links: column.links.map((link, currentLinkIndex) =>
                          currentLinkIndex === linkIndex
                              ? {
                                    label: patch.label ?? link.label,
                                    href: patch.href ?? link.href,
                                }
                              : link,
                      ),
                  }
                : column,
        ),
    );
}

function removeColumnLink(form: ReturnType<typeof useForm<FooterForm>>, columnIndex: number, linkIndex: number) {
    form.setData(
        'link_columns',
        form.data.link_columns.map((column, index) =>
            index === columnIndex
                ? {
                      ...column,
                      links: column.links.filter((_, currentLinkIndex) => currentLinkIndex !== linkIndex),
                  }
                : column,
        ),
    );
}

function addBottomLink(form: ReturnType<typeof useForm<FooterForm>>) {
    form.setData('bottom_links', [...form.data.bottom_links, { ...blankLink }]);
}

function updateBottomLink(form: ReturnType<typeof useForm<FooterForm>>, index: number, patch: Partial<FooterLinkItem>) {
    form.setData(
        'bottom_links',
        form.data.bottom_links.map((link, linkIndex) =>
            linkIndex === index
                ? {
                      label: patch.label ?? link.label,
                      href: patch.href ?? link.href,
                  }
                : link,
        ),
    );
}

function removeBottomLink(form: ReturnType<typeof useForm<FooterForm>>, index: number) {
    form.setData(
        'bottom_links',
        form.data.bottom_links.filter((_, linkIndex) => linkIndex !== index),
    );
}

function errorFor(errors: Partial<Record<keyof FooterForm, string>>, key: string) {
    return (errors as Record<string, string>)[key];
}
