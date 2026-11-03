import { useState } from 'react'
import { places } from '../content/data'
import { Globe } from './Globe'
import { SectionHeader } from './SectionHeader'
import type { SectionProps } from './types'

export default function MapSection({ cluster }: SectionProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const current = selected === null ? null : places[selected]

  return (
    <>
      <SectionHeader kicker={cluster.subtitle} title={cluster.label}>
        <p>
          {places.length} stops so far. Drag the globe, or pick a place to fly there.
        </p>
      </SectionHeader>
      <div className="map-layout">
        <div className="map-globe">
          <Globe places={places} selected={selected} onSelect={setSelected} />
          <div className="map-detail" aria-live="polite">
            {current ? (
              <>
                <p className="map-detail-date">{current.date}</p>
                <h2>{current.name}</h2>
                <p>{current.note}</p>
              </>
            ) : (
              <p className="muted">Select a star for details.</p>
            )}
          </div>
        </div>
        <ol className="place-list">
          {places.map((p, i) => (
            <li key={p.name}>
              <button
                type="button"
                className={selected === i ? 'is-selected' : undefined}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
              >
                <span className="place-name">{p.name}</span>
                <span className="muted">{p.date}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
