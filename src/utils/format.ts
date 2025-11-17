// src/utils/format.ts
import i18n from '@/lib/i18n';

export function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(i18n.language, opts).format(d);
}
export function formatNumber(n: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(i18n.language, opts).format(n);
}