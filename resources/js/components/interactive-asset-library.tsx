import * as LucideIcons from 'lucide-react';
import type { CSSProperties, ElementType } from 'react';

type LucideComponent = ElementType<{ className?: string; strokeWidth?: number }>;

export interface ShapeOption {
    value: string;
    label: string;
    category: 'Dasar' | 'Geometri' | 'Panah' | 'Dekoratif' | 'Dialog';
    description: string;
}

export const SHAPE_OPTIONS: ShapeOption[] = [
    { value: 'rectangle', label: 'Kotak', category: 'Dasar', description: 'Area highlight standar.' },
    { value: 'rounded-rectangle', label: 'Kotak rounded', category: 'Dasar', description: 'Card atau panel lembut.' },
    { value: 'pill', label: 'Pill', category: 'Dasar', description: 'Badge atau tombol panjang.' },
    { value: 'circle', label: 'Lingkaran', category: 'Dasar', description: 'Titik fokus atau node.' },
    { value: 'ellipse', label: 'Elips', category: 'Dasar', description: 'Highlight oval.' },
    { value: 'diamond', label: 'Diamond', category: 'Geometri', description: 'Penanda keputusan.' },
    { value: 'triangle', label: 'Segitiga', category: 'Geometri', description: 'Arah atau perhatian.' },
    { value: 'triangle-down', label: 'Segitiga bawah', category: 'Geometri', description: 'Arah ke bawah.' },
    { value: 'pentagon', label: 'Pentagon', category: 'Geometri', description: 'Panel visual lima sisi.' },
    { value: 'hexagon', label: 'Hexagon', category: 'Geometri', description: 'Node teknis/robotik.' },
    { value: 'octagon', label: 'Octagon', category: 'Geometri', description: 'Warning atau stop.' },
    { value: 'parallelogram', label: 'Parallelogram', category: 'Geometri', description: 'Input/output proses.' },
    { value: 'trapezoid', label: 'Trapesium', category: 'Geometri', description: 'Label diagram.' },
    { value: 'arrow-right', label: 'Panah kanan', category: 'Panah', description: 'Alur ke kanan.' },
    { value: 'arrow-left', label: 'Panah kiri', category: 'Panah', description: 'Alur ke kiri.' },
    { value: 'arrow-up', label: 'Panah atas', category: 'Panah', description: 'Arah ke atas.' },
    { value: 'arrow-down', label: 'Panah bawah', category: 'Panah', description: 'Arah ke bawah.' },
    { value: 'chevron-right', label: 'Chevron kanan', category: 'Panah', description: 'Step berikutnya.' },
    { value: 'chevron-left', label: 'Chevron kiri', category: 'Panah', description: 'Step sebelumnya.' },
    { value: 'star', label: 'Bintang', category: 'Dekoratif', description: 'Poin penting.' },
    { value: 'burst', label: 'Burst', category: 'Dekoratif', description: 'Penekanan kuat.' },
    { value: 'plus', label: 'Plus', category: 'Dekoratif', description: 'Tambah atau gabung.' },
    { value: 'cross', label: 'Cross', category: 'Dekoratif', description: 'Tanda silang.' },
    { value: 'badge', label: 'Badge', category: 'Dekoratif', description: 'Label sertifikat.' },
    { value: 'speech-bubble', label: 'Bubble teks', category: 'Dialog', description: 'Penjelasan karakter.' },
    { value: 'callout', label: 'Callout', category: 'Dialog', description: 'Catatan penting.' },
    { value: 'cloud', label: 'Cloud', category: 'Dialog', description: 'Ide atau imajinasi.' },
    { value: 'heart', label: 'Heart', category: 'Dekoratif', description: 'Preferensi atau suka.' },
];

export const SHAPE_CATEGORIES = Array.from(new Set(SHAPE_OPTIONS.map((shape) => shape.category)));

export function shapeLabel(shape: string): string {
    return SHAPE_OPTIONS.find((option) => option.value === shape)?.label ?? 'Shape';
}

export function shapeStyle(shape: string, fallbackRadius = 12): CSSProperties {
    const roundedRadius = `${Math.max(0, fallbackRadius)}px`;

    switch (shape) {
        case 'rounded-rectangle':
            return { borderRadius: roundedRadius };
        case 'pill':
            return { borderRadius: '9999px' };
        case 'circle':
        case 'ellipse':
            return { borderRadius: '9999px' };
        case 'diamond':
            return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
        case 'triangle':
            return { clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' };
        case 'triangle-down':
            return { clipPath: 'polygon(0 0, 100% 0, 50% 100%)' };
        case 'pentagon':
            return { clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' };
        case 'hexagon':
            return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
        case 'octagon':
            return { clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' };
        case 'parallelogram':
            return { clipPath: 'polygon(18% 0%, 100% 0%, 82% 100%, 0% 100%)' };
        case 'trapezoid':
            return { clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)' };
        case 'arrow-right':
            return { clipPath: 'polygon(0 25%, 60% 25%, 60% 0, 100% 50%, 60% 100%, 60% 75%, 0 75%)' };
        case 'arrow-left':
            return { clipPath: 'polygon(40% 0, 40% 25%, 100% 25%, 100% 75%, 40% 75%, 40% 100%, 0 50%)' };
        case 'arrow-up':
            return { clipPath: 'polygon(50% 0, 100% 40%, 75% 40%, 75% 100%, 25% 100%, 25% 40%, 0 40%)' };
        case 'arrow-down':
            return { clipPath: 'polygon(25% 0, 75% 0, 75% 60%, 100% 60%, 50% 100%, 0 60%, 25% 60%)' };
        case 'chevron-right':
            return { clipPath: 'polygon(0 0, 55% 0, 100% 50%, 55% 100%, 0 100%, 45% 50%)' };
        case 'chevron-left':
            return { clipPath: 'polygon(45% 0, 100% 0, 55% 50%, 100% 100%, 45% 100%, 0 50%)' };
        case 'star':
            return { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 35%)' };
        case 'burst':
            return {
                clipPath:
                    'polygon(50% 0%, 60% 25%, 85% 12%, 75% 38%, 100% 50%, 75% 62%, 85% 88%, 60% 75%, 50% 100%, 40% 75%, 15% 88%, 25% 62%, 0% 50%, 25% 38%, 15% 12%, 40% 25%)',
            };
        case 'plus':
            return { clipPath: 'polygon(38% 0, 62% 0, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0 62%, 0 38%, 38% 38%)' };
        case 'cross':
            return { clipPath: 'polygon(20% 0, 50% 30%, 80% 0, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0 80%, 30% 50%, 0 20%)' };
        case 'badge':
            return {
                clipPath:
                    'polygon(50% 0%, 62% 14%, 80% 8%, 86% 26%, 100% 38%, 88% 52%, 92% 70%, 74% 76%, 62% 100%, 50% 82%, 38% 100%, 26% 76%, 8% 70%, 12% 52%, 0 38%, 14% 26%, 20% 8%, 38% 14%)',
            };
        case 'speech-bubble':
            return { borderRadius: roundedRadius, clipPath: 'polygon(0 0, 100% 0, 100% 78%, 68% 78%, 55% 100%, 48% 78%, 0 78%)' };
        case 'callout':
            return { borderRadius: roundedRadius, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 18% 100%, 18% 72%, 0 84%)' };
        case 'cloud':
            return {
                borderRadius: '9999px',
                clipPath: 'ellipse(50% 40% at 50% 55%)',
            };
        case 'heart':
            return {
                clipPath: 'polygon(50% 92%, 12% 54%, 4% 35%, 10% 16%, 27% 8%, 43% 18%, 50% 30%, 57% 18%, 73% 8%, 90% 16%, 96% 35%, 88% 54%)',
            };
        case 'rectangle':
        default:
            return { borderRadius: '0px' };
    }
}

export function humanizeIconName(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

const iconModule = LucideIcons as unknown as Record<string, unknown>;

function isLucideComponent(value: unknown): value is LucideComponent {
    return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);
}

export const ICON_OPTIONS = Object.keys(iconModule)
    .filter((name) => /^[A-Z]/.test(name))
    .filter((name) => !name.endsWith('Icon'))
    .filter((name) => !['Icon', 'LucideIcon', 'icons'].includes(name))
    .filter((name) => isLucideComponent(iconModule[name]))
    .sort()
    .map((name) => ({
        value: name,
        label: humanizeIconName(name),
        search: `${name} ${humanizeIconName(name)}`.toLowerCase(),
    }));

export const ICON_CATEGORIES = [
    { value: 'popular', label: 'Populer' },
    { value: 'robotics', label: 'Robotik & teknologi' },
    { value: 'education', label: 'Pendidikan' },
    { value: 'media', label: 'Media' },
    { value: 'ui', label: 'UI & navigasi' },
    { value: 'status', label: 'Status' },
    { value: 'commerce', label: 'Toko & pembayaran' },
    { value: 'people', label: 'Orang & sekolah' },
    { value: 'all', label: 'Semua icon' },
] as const;

const curatedIconNames: Record<string, string[]> = {
    popular: [
        'Cpu',
        'CircuitBoard',
        'Bot',
        'BookOpen',
        'GraduationCap',
        'School',
        'Lightbulb',
        'Zap',
        'Star',
        'Award',
        'Image',
        'Video',
        'Volume2',
        'MousePointerClick',
        'CheckCircle2',
        'BadgeCheck',
    ],
    robotics: [
        'Cpu',
        'CircuitBoard',
        'Bot',
        'BotMessageSquare',
        'BotOff',
        'BrainCircuit',
        'Microchip',
        'Cable',
        'Plug',
        'PlugZap',
        'Plug2',
        'Usb',
        'Radio',
        'Radar',
        'Satellite',
        'SatelliteDish',
        'Wifi',
        'WifiOff',
        'Bluetooth',
        'BluetoothConnected',
        'Battery',
        'BatteryCharging',
        'Gauge',
        'HardDrive',
        'Server',
        'Database',
        'MemoryStick',
        'Monitor',
        'Laptop',
        'Tablet',
        'Smartphone',
        'Workflow',
    ],
    education: [
        'BookOpen',
        'Book',
        'BookMarked',
        'BookOpenCheck',
        'BookText',
        'Notebook',
        'NotebookPen',
        'GraduationCap',
        'School',
        'Presentation',
        'Projector',
        'Library',
        'Pencil',
        'Pen',
        'PenTool',
        'Eraser',
        'Ruler',
        'Clipboard',
        'ClipboardCheck',
        'ClipboardList',
        'FileText',
        'FileCode',
        'FileQuestion',
        'FileCheck',
        'Files',
        'Folder',
        'FolderOpen',
        'Archive',
        'Award',
        'Medal',
        'Trophy',
        'Bookmark',
    ],
    media: [
        'Image',
        'Images',
        'ImagePlus',
        'ImageUp',
        'Camera',
        'CameraOff',
        'Video',
        'VideoOff',
        'Film',
        'Clapperboard',
        'FileAudio',
        'AudioLines',
        'AudioWaveform',
        'Mic',
        'MicOff',
        'Volume',
        'Volume1',
        'Volume2',
        'VolumeX',
        'Music',
        'Play',
        'Pause',
        'CirclePlay',
        'CirclePause',
        'SquarePlay',
        'SkipBack',
        'SkipForward',
        'Repeat',
        'Shuffle',
        'Podcast',
        'Captions',
        'CaptionsOff',
    ],
    ui: [
        'MousePointer',
        'MousePointer2',
        'MousePointerClick',
        'Hand',
        'Pointer',
        'Move',
        'MoveHorizontal',
        'MoveVertical',
        'Maximize',
        'Minimize',
        'ZoomIn',
        'ZoomOut',
        'Search',
        'Settings',
        'Settings2',
        'SlidersHorizontal',
        'PanelLeft',
        'PanelRight',
        'LayoutDashboard',
        'Grid',
        'Layers',
        'Layers2',
        'Layers3',
        'Eye',
        'EyeOff',
        'Lock',
        'Unlock',
        'Copy',
        'Trash2',
        'Save',
        'Upload',
        'Download',
        'RefreshCw',
        'RotateCw',
        'Undo',
        'Redo',
    ],
    status: [
        'Check',
        'CheckCheck',
        'CircleCheck',
        'BadgeCheck',
        'ShieldCheck',
        'X',
        'CircleX',
        'Ban',
        'OctagonX',
        'AlertCircle',
        'AlertTriangle',
        'TriangleAlert',
        'Info',
        'CircleAlert',
        'BadgeAlert',
        'BadgeInfo',
        'BadgeHelp',
        'CircleHelp',
        'Bell',
        'BellRing',
        'BellOff',
        'Megaphone',
        'Flag',
        'Shield',
        'ShieldAlert',
        'ShieldX',
        'ShieldQuestion',
        'CircleOff',
        'Loader',
        'LoaderCircle',
    ],
    commerce: [
        'ShoppingCart',
        'ShoppingBag',
        'Store',
        'Package',
        'PackageCheck',
        'PackageOpen',
        'PackagePlus',
        'PackageSearch',
        'Boxes',
        'Box',
        'Truck',
        'Warehouse',
        'Receipt',
        'ReceiptText',
        'Wallet',
        'CreditCard',
        'Banknote',
        'Coins',
        'BadgeDollarSign',
        'DollarSign',
        'Percent',
        'Tag',
        'Tags',
        'TicketPercent',
        'Barcode',
        'QrCode',
        'ScanBarcode',
        'ScanQrCode',
        'HandCoins',
        'ChartBar',
        'TrendingUp',
        'Gift',
    ],
    people: [
        'User',
        'UserRound',
        'Users',
        'UsersRound',
        'UserPlus',
        'UserCheck',
        'UserCog',
        'UserSearch',
        'UserX',
        'Contact',
        'IdCard',
        'Smile',
        'Heart',
        'Handshake',
        'HelpingHand',
        'Accessibility',
        'Crown',
        'BriefcaseBusiness',
        'Building',
        'Building2',
        'House',
        'Home',
        'MapPin',
        'Map',
        'Navigation',
        'Compass',
        'Globe',
        'Languages',
        'MessageCircle',
        'MessagesSquare',
        'Mail',
        'Phone',
        'Calendar',
        'Clock',
    ],
};

export function iconsForCategory(category: string) {
    if (category === 'all') {
        return ICON_OPTIONS;
    }

    const curated = curatedIconNames[category] ?? [];
    const curatedSet = new Set(curated);

    return ICON_OPTIONS.filter((icon) => curatedSet.has(icon.value));
}

export function LucideIconRenderer({ name, className }: { name?: string | null; className?: string }) {
    const Icon = resolveLucideIcon(name);

    return <Icon className={className} />;
}

export function resolveLucideIcon(name?: string | null): LucideComponent {
    const legacyAliases: Record<string, string> = {
        lightbulb: 'Lightbulb',
        cpu: 'Cpu',
        zap: 'Zap',
        book: 'BookOpen',
    };
    const iconName = name ? (legacyAliases[name] ?? name) : 'Lightbulb';
    const candidate = isLucideComponent(iconModule[iconName]) ? iconModule[iconName] : iconModule.Lightbulb;

    return candidate as LucideComponent;
}
