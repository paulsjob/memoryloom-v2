
/**
 * MemoryLoom UI Utilities
 */

export function cn(...classes: (string | undefined | boolean | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
