<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FooterSetting;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class FooterSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/footer', [
            'footer' => FooterSetting::defaultSetting()->toPayload(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $setting = FooterSetting::defaultSetting();
        $data = $this->validated($request);

        $setting->update($data);
        AuditLogger::log('footer_setting.updated', $request->user(), $setting);

        return back()->with('success', 'Footer berhasil diperbarui.');
    }

    private function validated(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'description' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'business_hours' => ['nullable', 'string', 'max:255'],
            'copyright_text' => ['nullable', 'string', 'max:255'],
            'is_visible' => ['required'],
            'link_columns' => ['sometimes', 'array', 'max:4'],
            'link_columns.*.title' => ['nullable', 'string', 'max:100'],
            'link_columns.*.links' => ['sometimes', 'array', 'max:8'],
            'link_columns.*.links.*.label' => ['nullable', 'string', 'max:100'],
            'link_columns.*.links.*.href' => ['nullable', 'string', 'max:2048'],
            'bottom_links' => ['sometimes', 'array', 'max:8'],
            'bottom_links.*.label' => ['nullable', 'string', 'max:100'],
            'bottom_links.*.href' => ['nullable', 'string', 'max:2048'],
        ]);

        $validator->after(function ($validator) use ($request) {
            foreach ((array) $request->input('link_columns', []) as $columnIndex => $column) {
                $links = is_array($column) ? (array) ($column['links'] ?? []) : [];
                $hasLinks = collect($links)->contains(fn ($link) => filled($link['label'] ?? null) || filled($link['href'] ?? null));

                if ($hasLinks && ! filled($column['title'] ?? null)) {
                    $validator->errors()->add("link_columns.$columnIndex.title", 'Judul kolom wajib diisi jika kolom memiliki link.');
                }

                $this->validateLinks($validator, $links, "link_columns.$columnIndex.links");
            }

            $this->validateLinks($validator, (array) $request->input('bottom_links', []), 'bottom_links');
        });

        $data = $validator->validate();

        foreach ([
            'description',
            'address',
            'email',
            'phone',
            'business_hours',
            'copyright_text',
        ] as $field) {
            $data[$field] = filled($data[$field] ?? null) ? $data[$field] : null;
        }

        $data['is_visible'] = filter_var($data['is_visible'], FILTER_VALIDATE_BOOL);
        $data['link_columns'] = $this->normalizedColumns($data['link_columns'] ?? []);
        $data['bottom_links'] = $this->normalizedLinks($data['bottom_links'] ?? []);

        return $data;
    }

    private function validateLinks($validator, array $links, string $prefix): void
    {
        foreach ($links as $linkIndex => $link) {
            $label = $link['label'] ?? null;
            $href = $link['href'] ?? null;

            if (! filled($label) && ! filled($href)) {
                continue;
            }

            if (! filled($label)) {
                $validator->errors()->add("$prefix.$linkIndex.label", 'Label link wajib diisi.');
            }

            if (! filled($href)) {
                $validator->errors()->add("$prefix.$linkIndex.href", 'URL link wajib diisi.');
            }

            if (filled($href) && $this->unsafeHref($href)) {
                $validator->errors()->add("$prefix.$linkIndex.href", 'URL link tidak boleh menggunakan skema javascript, data, atau vbscript.');
            }
        }
    }

    private function normalizedColumns(array $columns): array
    {
        return collect($columns)
            ->filter(fn ($column) => is_array($column))
            ->map(function (array $column) {
                $links = $this->normalizedLinks($column['links'] ?? []);

                if (! filled($column['title'] ?? null) && $links === []) {
                    return null;
                }

                return [
                    'title' => $column['title'] ?? '',
                    'links' => $links,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function normalizedLinks(array $links): array
    {
        return collect($links)
            ->filter(fn ($link) => is_array($link) && filled($link['label'] ?? null) && filled($link['href'] ?? null))
            ->map(fn (array $link) => [
                'label' => $link['label'],
                'href' => $link['href'],
            ])
            ->values()
            ->all();
    }

    private function unsafeHref(string $href): bool
    {
        return preg_match('/^\s*(javascript|data|vbscript):/i', $href) === 1;
    }
}
