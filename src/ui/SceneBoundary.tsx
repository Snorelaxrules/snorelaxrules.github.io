import { Component, type ReactNode } from 'react'
import { useGalaxy } from '../state/galaxyStore'
import { useIntro } from '../state/introStore'

/**
 * If the WebGL scene fails (driver issue, context creation error), drop it and
 * keep the site usable: skip the intro, open pages without flights, and show a
 * static CSS starfield instead.
 */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    useGalaxy.getState().disableScene()
    useIntro.getState().forceArrive()
  }

  render() {
    return this.state.failed ? <div className="space-fallback" aria-hidden="true" /> : this.props.children
  }
}
