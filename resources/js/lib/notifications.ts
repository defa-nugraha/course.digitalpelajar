import { toast } from 'sonner';

type NotificationLevel = 'success' | 'error' | 'warning' | 'message';

const recentNotifications = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 900;

function notify(level: NotificationLevel, message: string) {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
        return;
    }

    const now = Date.now();

    for (const [key, timestamp] of recentNotifications) {
        if (now - timestamp > DUPLICATE_WINDOW_MS * 2) {
            recentNotifications.delete(key);
        }
    }

    const id = `platform-${level}-${normalizedMessage}`;
    const previousTimestamp = recentNotifications.get(id);

    if (previousTimestamp !== undefined && now - previousTimestamp < DUPLICATE_WINDOW_MS) {
        return;
    }

    recentNotifications.set(id, now);

    if (recentNotifications.size > 100) {
        const oldestKey = recentNotifications.keys().next().value;

        if (oldestKey) {
            recentNotifications.delete(oldestKey);
        }
    }

    toast[level](normalizedMessage, { id });
}

export const notifySuccess = (message: string) => notify('success', message);
export const notifyError = (message: string) => notify('error', message);
export const notifyWarning = (message: string) => notify('warning', message);
export const notifyMessage = (message: string) => notify('message', message);
