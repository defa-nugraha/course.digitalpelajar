import { Head } from '@inertiajs/react';

export interface SeoData {
    title?: string;
    description?: string;
    canonical?: string;
    image?: string;
    type?: string;
    noindex?: boolean;
    keywords?: string[];
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SeoHead({ seo, fallbackTitle }: { seo?: SeoData; fallbackTitle: string }) {
    const title = seo?.title ?? fallbackTitle;
    const description = seo?.description;
    const canonical = seo?.canonical;
    const image = seo?.image;
    const type = seo?.type ?? 'website';
    const keywords = seo?.keywords?.filter(Boolean).join(', ');
    const jsonLdItems = Array.isArray(seo?.jsonLd) ? seo?.jsonLd : seo?.jsonLd ? [seo.jsonLd] : [];

    return (
        <Head title={title}>
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}
            <meta name="robots" content={seo?.noindex ? 'noindex,nofollow' : 'index,follow'} />
            {canonical && <link rel="canonical" href={canonical} />}
            <meta property="og:title" content={title} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:type" content={type} />
            {canonical && <meta property="og:url" content={canonical} />}
            {image && <meta property="og:image" content={image} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            {description && <meta name="twitter:description" content={description} />}
            {image && <meta name="twitter:image" content={image} />}
            {jsonLdItems.map((item, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ))}
        </Head>
    );
}
