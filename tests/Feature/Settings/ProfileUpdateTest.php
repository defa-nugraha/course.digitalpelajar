<?php

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('student profile can request existing school without becoming school student automatically', function () {
    $school = School::factory()->create(['status' => 'active']);
    $user = User::factory()->create(['role' => 'student', 'school_id' => null]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Siswa Lengkap',
            'email' => 'siswa-lengkap@example.test',
            'phone' => '+62 812 3456 7890',
            'address' => 'Jl. Robotika No. 1',
            'school_id' => $school->id,
            'manual_school_name' => '',
            'manual_school_address' => '',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->school_id)->toBeNull()
        ->and($user->requested_school_id)->toBe($school->id)
        ->and($user->school_verification_status)->toBe('pending')
        ->and($user->manual_school_name)->toBeNull()
        ->and($user->manual_school_address)->toBeNull()
        ->and($user->phone)->toBe('+62 812 3456 7890')
        ->and($user->address)->toBe('Jl. Robotika No. 1')
        ->and($user->profile_completed_at)->not->toBeNull();
});

test('profile can be completed with manual school option', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Siswa Manual',
            'email' => 'siswa-manual@example.test',
            'phone' => '081234567890',
            'address' => 'Jl. Belajar No. 2',
            'school_id' => 'other',
            'manual_school_name' => 'Sekolah Belum Terdaftar',
            'manual_school_address' => 'Ngawi',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->school_id)->toBeNull()
        ->and($user->requested_school_id)->toBeNull()
        ->and($user->school_verification_status)->toBe('pending')
        ->and($user->manual_school_name)->toBe('Sekolah Belum Terdaftar')
        ->and($user->manual_school_address)->toBe('Ngawi')
        ->and($user->profile_completed_at)->not->toBeNull();
});

test('admin can approve school request by assigning official school', function () {
    $school = School::factory()->create(['status' => 'active']);
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $student = User::factory()->create([
        'role' => 'student',
        'school_id' => null,
        'requested_school_id' => $school->id,
        'school_verification_status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->patch("/admin/users/{$student->id}", [
            'school_id' => $school->id,
            'name' => $student->name,
            'email' => $student->email,
            'role' => 'student',
            'status' => 'active',
            'password' => '',
            'password_confirmation' => '',
        ])
        ->assertSessionHasNoErrors();

    $student->refresh();

    expect($student->school_id)->toBe($school->id)
        ->and($student->requested_school_id)->toBeNull()
        ->and($student->school_verification_status)->toBe('approved');
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/settings/profile');

    expect($user->fresh())->not->toBeNull();
});
