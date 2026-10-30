<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @php
            $seo = $page['props']['seo'] ?? [];
            $seoTitle = $seo['title'] ?? config('app.name', 'Digital Pelajar Tech Solutions');
            $seoDescription = $seo['description'] ?? null;
            $seoCanonical = $seo['canonical'] ?? url()->current();
            $seoImage = $seo['image'] ?? asset('logo.png');
            $seoType = $seo['type'] ?? 'website';
            $seoRobots = ($seo['noindex'] ?? false) ? 'noindex,nofollow' : 'index,follow';
            $seoKeywords = collect($seo['keywords'] ?? [])->filter()->implode(', ');
            $jsonLdItems = collect($seo['jsonLd'] ?? [])->filter()->values();
            $headIcon = asset('Logo%20Digital%20Pelajar%20%28tanpa%20teks%29.png') . '?v=20261030';
        @endphp

        <title inertia>{{ $seoTitle }}</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" type="image/png" href="{{ $headIcon }}">
        <link rel="shortcut icon" type="image/png" href="{{ $headIcon }}">
        <link rel="apple-touch-icon" href="{{ $headIcon }}">
        @if ($seoDescription)
            <meta name="description" content="{{ $seoDescription }}">
        @endif
        @if ($seoKeywords)
            <meta name="keywords" content="{{ $seoKeywords }}">
        @endif
        <meta name="robots" content="{{ $seoRobots }}">
        <link rel="canonical" href="{{ $seoCanonical }}">
        <meta property="og:title" content="{{ $seoTitle }}">
        @if ($seoDescription)
            <meta property="og:description" content="{{ $seoDescription }}">
        @endif
        <meta property="og:type" content="{{ $seoType }}">
        <meta property="og:url" content="{{ $seoCanonical }}">
        <meta property="og:image" content="{{ $seoImage }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $seoTitle }}">
        @if ($seoDescription)
            <meta name="twitter:description" content="{{ $seoDescription }}">
        @endif
        <meta name="twitter:image" content="{{ $seoImage }}">
        @foreach ($jsonLdItems as $schema)
            <script type="application/ld+json">@json($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)</script>
        @endforeach

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
