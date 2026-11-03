import { about } from '../content/about'
import { site } from '../content/site'
import { SectionHeader } from './SectionHeader'
import type { SectionProps } from './types'

const initials = site.name
  .split(/\s+/)
  .map((w) => w[0])
  .join('')
  .slice(0, 2)

export default function About({ cluster }: SectionProps) {
  return (
    <>
      <SectionHeader kicker={cluster.subtitle} title={site.name} />
      <div className="about-grid">
        <aside className="about-card">
          {about.photo ? (
            <img className="about-photo" src={about.photo} alt={`Portrait of ${site.name}`} />
          ) : (
            <div className="about-photo about-photo-placeholder" role="img" aria-label="Photo placeholder">
              <span>{initials}</span>
            </div>
          )}
          <dl className="about-facts">
            {about.role && (
              <div>
                <dt>Role</dt>
                <dd>{about.role}</dd>
              </div>
            )}
            {about.location && (
              <div>
                <dt>Based</dt>
                <dd>{about.location}</dd>
              </div>
            )}
          </dl>
          {about.resume && (
            <a className="button" href={about.resume} target="_blank" rel="noreferrer">
              View résumé
            </a>
          )}
        </aside>
        <div className="prose" dangerouslySetInnerHTML={{ __html: about.html }} />
      </div>
    </>
  )
}
