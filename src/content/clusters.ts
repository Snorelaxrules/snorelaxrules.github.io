import raw from '../../content/clusters.json'

export type ClusterKind = 'spiral' | 'elliptical' | 'globular' | 'beacon'

export interface ClusterConfig {
  id: string
  label: string
  subtitle: string
  route: string
  kind: ClusterKind
  position: [number, number, number]
  size: number
  color: string
  coreColor?: string
  arms?: number
  /** [x, z] degrees */
  tilt?: [number, number]
  /** degrees per second */
  spin?: number
  particles?: number
}

export const clusters = raw.clusters as ClusterConfig[]

export const clusterById = (id: string | null) => clusters.find((c) => c.id === id) ?? null

export const clusterForPath = (pathname: string) =>
  clusters.find((c) => pathname === c.route || pathname.startsWith(`${c.route}/`)) ?? null
