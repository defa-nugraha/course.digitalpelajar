<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use LogicException;

test('student numbers are unique six digit identifiers and are reserved to their account', function () {
    $firstStudent = User::factory()->student()->create();
    $secondStudent = User::factory()->student()->create();

    expect($firstStudent->student_number)
        ->toMatch('/^\d{6}$/')
        ->not->toBe($secondStudent->student_number);

    expect(DB::table('student_number_reservations')
        ->where('student_number', $firstStudent->student_number)
        ->value('user_id'))->toBe($firstStudent->id);
});

test('a student number cannot be changed after account creation', function () {
    $student = User::factory()->student()->create();
    $originalNumber = $student->student_number;

    $student->student_number = '000001';

    expect(fn () => $student->save())
        ->toThrow(LogicException::class, 'ID siswa bersifat permanen');

    expect($student->fresh()->student_number)->toBe($originalNumber);
});

test('a deleted student number stays reserved and is never reused', function () {
    $deletedStudent = User::factory()->student()->create();
    $reservedNumber = $deletedStudent->student_number;

    $deletedStudent->delete();

    expect(DB::table('student_number_reservations')
        ->where('student_number', $reservedNumber)
        ->exists())->toBeTrue()
        ->and(DB::table('student_number_reservations')
            ->where('student_number', $reservedNumber)
            ->value('user_id'))->toBeNull();

    $replacementStudent = User::factory()->student()->create();

    expect($replacementStudent->student_number)->not->toBe($reservedNumber);
});
