<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Midtrans Payment Gateway
    |--------------------------------------------------------------------------
    | Configuration for Midtrans Snap integration (FR-018, FR-019, PG-001..006).
    | Set MIDTRANS_IS_ENABLED=false to use the local mock checkout, which is
    | useful for development, QA, and automated tests that must not contact
    | the real Midtrans API.
    |
    */

    'is_enabled' => env('MIDTRANS_IS_ENABLED', false),

    // Simulation is enabled by default only in local/testing environments.
    'mock_enabled' => env('MIDTRANS_MOCK_ENABLED', in_array(env('APP_ENV', 'production'), ['local', 'testing'], true)),

    'merchant_id' => env('MIDTRANS_MERCHANT_ID'),
    'server_key' => env('MIDTRANS_SERVER_KEY'),
    'client_key' => env('MIDTRANS_CLIENT_KEY'),

    // sandbox | production
    'environment' => env('MIDTRANS_ENVIRONMENT', 'sandbox'),

    'snap_url' => env('MIDTRANS_SNAP_URL', 'https://app.sandbox.midtrans.com/snap/v1/transactions'),

    'api_url' => env('MIDTRANS_API_URL', 'https://api.sandbox.midtrans.com'),

    // Order id prefix used by PG-001.
    'order_prefix' => env('MIDTRANS_ORDER_PREFIX', 'NGW'),

    // Required only when testing the public notification endpoint with Midtrans disabled.
    'mock_notification_secret' => env('MIDTRANS_MOCK_NOTIFICATION_SECRET'),
];
