<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\\-\\s]+$/'],
            'address' => ['nullable', 'string', 'max:1000'],
            'school_id' => [
                'nullable',
                Rule::when(
                    $this->input('school_id') === 'other',
                    ['in:other'],
                    [Rule::exists('schools', 'id')->where(fn ($query) => $query->where('status', 'active'))],
                ),
            ],
            'manual_school_name' => [
                Rule::requiredIf(fn () => $this->input('school_id') === 'other'),
                'nullable',
                'string',
                'max:255',
            ],
            'manual_school_address' => [
                Rule::requiredIf(fn () => $this->input('school_id') === 'other'),
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }
}
