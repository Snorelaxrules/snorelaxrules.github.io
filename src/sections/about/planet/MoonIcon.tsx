/** Small glyphs for the moons. `icon` in content/about/planet.json picks one. */

export type MoonIconName = 'book' | 'game' | 'spotify' | 'music' | 'film'

export function MoonIcon({ name }: { name?: string }) {
  switch (name) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="moon-glyph">
          <path
            d="M12 6.5C10.2 5.2 7.6 4.6 4 4.8v13.4c3.6-.2 6.2.4 8 1.7m0-13.4c1.8-1.3 4.4-1.9 8-1.7v13.4c-3.6-.2-6.2.4-8 1.7m0-13.4v13.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'game':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="moon-glyph">
          <path
            d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.9 4.6a2.4 2.4 0 0 1-4.1 2.1L15.5 15h-7l-2.2 2.3a2.4 2.4 0 0 1-4.1-2.1l.9-4.6A4.5 4.5 0 0 1 7.5 7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.5 9.6v3.2M5.9 11.2h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="15.6" cy="10.4" r="1" fill="currentColor" />
          <circle cx="17.6" cy="12.4" r="1" fill="currentColor" />
        </svg>
      )
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="moon-glyph moon-glyph-spotify">
          <circle cx="12" cy="12" r="10" fill="#1ed760" />
          <path
            d="M6.6 9.3c3.6-1.1 7.8-.8 11 1M7.2 12.6c3-.9 6.3-.6 8.9.9M7.8 15.7c2.4-.6 4.9-.4 6.9.7"
            fill="none"
            stroke="#04060d"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'music':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="moon-glyph">
          <path d="M9 17.5V6l10-2v11.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="6.8" cy="17.5" r="2.3" fill="currentColor" />
          <circle cx="16.8" cy="15.5" r="2.3" fill="currentColor" />
        </svg>
      )
    case 'film':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="moon-glyph">
          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    default:
      return null
  }
}
