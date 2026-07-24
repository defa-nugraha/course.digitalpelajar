<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest can open public home page', function () {
    $this->get('/')->assertOk();
});

test('authenticated user still opens public home page instead of dashboard redirect', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/')
        ->assertOk()
        ->assertSee('app');
});
