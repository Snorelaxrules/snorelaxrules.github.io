import { useState } from 'react'
import { contact } from '../content/data'
import { SectionHeader } from './SectionHeader'
import type { SectionProps } from './types'

export default function Contact({ cluster }: SectionProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — the mailto link still works
    }
  }

  return (
    <>
      <SectionHeader kicker={cluster.subtitle} title={contact.heading}>
        <p>{contact.intro}</p>
      </SectionHeader>
      <div className="transmit">
        <p className="transmit-label">Frequency</p>
        <a className="transmit-email" href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
        <div className="transmit-actions">
          <a className="button" href={`mailto:${contact.email}`}>
            Open channel
          </a>
          <button type="button" className="button button-ghost" onClick={copy}>
            {copied ? 'Copied' : 'Copy address'}
          </button>
        </div>
      </div>
      {contact.links.length > 0 && (
        <ul className="link-list">
          {contact.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer">
                <span>{l.label}</span>
                <span className="muted">{l.handle} ↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
