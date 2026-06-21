import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a size value to a whole number GB string.
 * Example: 5.00 -> "5GB"
 */
export function formatGb(size: string | number | null | undefined): string {
  if (!size) return '';
  const clean = size.toString().replace(/GB/i, '').trim();
  const value = parseFloat(clean);
  if (isNaN(value)) return clean;
  return Math.floor(value).toString() + 'GB';
}

/**
 * Formats a date into a long string like "22nd May 2026 7:50 AM"
 */
export function formatLongDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${getOrdinal(day)} ${month} ${year} ${time}`;
}
