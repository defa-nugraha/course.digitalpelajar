<?php

use Symfony\Component\HttpKernel\Exception\HttpException;

test('method not allowed errors render the Blade template without exposing compiled PHP', function () {
    config(['app.debug' => false]);

    $this->post('/pembayaran')
        ->assertStatus(405)
        ->assertSee('Error 405')
        ->assertDontSee('<?php echo e(', false)
        ->assertDontSee('{{ $exception->getStatusCode() }}', false);
});

test('server error fallback renders dynamic status codes as Blade output', function () {
    $html = view('errors.5xx', [
        'exception' => new HttpException(503),
    ])->render();

    expect($html)
        ->toContain('Error 503')
        ->toContain('<h1>503</h1>')
        ->not->toContain('<?php echo e(')
        ->not->toContain('{{ $exception->getStatusCode() }}');
});
