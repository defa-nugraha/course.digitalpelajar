<?php

use App\Models\FooterSetting;
use App\Models\User;

test('admin can manage footer content and public pages receive updated footer data', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/admin/footer')
        ->assertOk();

    $this->actingAs($admin)
        ->patch('/admin/footer', [
            'description' => 'Footer dinamis untuk Digital Pelajar.',
            'address' => 'Ngawi, Jawa Timur',
            'email' => 'halo@example.test',
            'phone' => '08123456789',
            'business_hours' => 'Senin–Sabtu, 08.00–16.00 WIB',
            'copyright_text' => '© 2026 Digital Pelajar.',
            'is_visible' => true,
            'link_columns' => [
                [
                    'title' => 'Informasi',
                    'links' => [
                        ['label' => 'Katalog', 'href' => '/courses'],
                        ['label' => 'Kontak', 'href' => 'mailto:halo@example.test'],
                    ],
                ],
            ],
            'bottom_links' => [
                ['label' => 'Login', 'href' => '/login'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $footer = FooterSetting::defaultSetting()->fresh();

    expect($footer->description)->toBe('Footer dinamis untuk Digital Pelajar.')
        ->and($footer->link_columns[0]['title'])->toBe('Informasi')
        ->and($footer->bottom_links[0]['href'])->toBe('/login');

    $this->get('/')
        ->assertOk()
        ->assertSee('Footer dinamis untuk Digital Pelajar.')
        ->assertSee('halo@example.test')
        ->assertSee('Informasi');
});

test('footer management is restricted to admin and rejects unsafe links', function () {
    $student = User::factory()->student()->create();
    $admin = User::factory()->admin()->create();

    $this->actingAs($student)
        ->patch('/admin/footer', [])
        ->assertForbidden();

    $this->actingAs($admin)
        ->patch('/admin/footer', [
            'description' => 'Footer aman.',
            'address' => null,
            'email' => null,
            'phone' => null,
            'business_hours' => null,
            'copyright_text' => null,
            'is_visible' => true,
            'link_columns' => [
                [
                    'title' => 'Bahaya',
                    'links' => [
                        ['label' => 'Script', 'href' => 'javascript:alert(1)'],
                    ],
                ],
            ],
            'bottom_links' => [],
        ])
        ->assertSessionHasErrors('link_columns.0.links.0.href');
});
