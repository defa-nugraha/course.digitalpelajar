import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

export default function BrandLogo({ className, alt = 'Logo', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/logo.png" alt={alt} className={cn('h-10 w-auto object-contain', className)} {...props} />;
}
