/** Reader preferences, remembered per browser. Storage access is guarded: blocked storage just means defaults. */

export type FontSize = 's' | 'm' | 'l'

export const FONT_SIZES: { id: FontSize; label: string; name: string }[] = [
  { id: 's', label: 'S', name: 'Small' },
  { id: 'm', label: 'M', name: 'Medium' },
  { id: 'l', label: 'L', name: 'Large' },
]

const KEY = 'tl:reader-size'

export function loadFontSize(): FontSize {
  try {
    const v = localStorage.getItem(KEY)
    return v === 's' || v === 'm' || v === 'l' ? v : 'm'
  } catch {
    return 'm'
  }
}

export function saveFontSize(size: FontSize) {
  try {
    localStorage.setItem(KEY, size)
  } catch {
    // storage unavailable: the choice lasts until the page reloads
  }
}
