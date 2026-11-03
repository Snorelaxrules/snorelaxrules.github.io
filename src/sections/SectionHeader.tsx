import type { ReactNode } from 'react'

export function SectionHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="section-header">
      <p className="section-kicker">{kicker}</p>
      <h1>{title}</h1>
      {children && <div className="section-lede">{children}</div>}
    </header>
  )
}
