import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { clusterById, clusters } from '../../content/clusters'
import { goTo, useGalaxy } from '../../state/galaxyStore'
import { useIntro } from '../../state/introStore'
import { flight } from '../flight'
import { damp, prefersReducedMotion } from '../pointer'
import { SHIP } from './shipConfig'
import { ShipModel } from './ShipModel'
import { ShipTrail } from './ShipTrail'
import { type Direction, keys, rangeOf, ship } from './shipState'

const KEYMAP: Record<string, Direction> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

/** Shortest signed angle from a to b, radians. */
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** Keys only steer the ship on the galaxy view, never while a page is open or during the intro. */
const canFly = () => useIntro.getState().phase === 'arrived' && useGalaxy.getState().activeId === null

/**
 * The player ship: keyboard input, framerate-independent physics, banking,
 * proximity targeting, and controls-hint timing. Visuals live in ShipModel
 * (swappable) and ShipTrail.
 */
export function Ship() {
  const bodyRef = useRef<Group>(null)
  const bankRef = useRef<Group>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !canFly()) return
      const dir = KEYMAP[e.code]
      if (dir) {
        e.preventDefault()
        keys.add(dir)
        // a focused HUD button would otherwise swallow Space
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur()
        }
        return
      }
      if (e.code === 'Space') {
        const target = clusterById(useGalaxy.getState().proximity)
        if (!target) return
        e.preventDefault()
        if (!e.repeat) goTo(target.route)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code]
      if (dir) keys.delete(dir)
    }
    const clear = () => keys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      keys.clear()
    }
  }, [])

  useFrame(({ clock }, delta) => {
    const body = bodyRef.current
    const bank = bankRef.current
    if (!body || !bank) return
    const dt = Math.min(delta, 0.05)
    const reduced = prefersReducedMotion()
    const flying = canFly()
    const galaxy = useGalaxy.getState()

    // --- input ---------------------------------------------------------------
    let ix = 0
    let iy = 0
    if (flying) {
      if (keys.has('left')) ix -= 1
      if (keys.has('right')) ix += 1
      if (keys.has('up')) iy += 1
      if (keys.has('down')) iy -= 1
    } else if (keys.size) {
      keys.clear()
    }
    const thrusting = ix !== 0 || iy !== 0
    if (thrusting) {
      const len = Math.hypot(ix, iy)
      ix /= len
      iy /= len
    }

    // --- physics -------------------------------------------------------------
    const { pos, vel } = ship
    vel.x += ix * SHIP.accel * dt
    vel.y += iy * SHIP.accel * dt
    const decay = Math.exp(-SHIP.drag * dt)
    vel.x *= decay
    vel.y *= decay

    const b = SHIP.bounds
    const k = SHIP.boundaryStiffness * dt
    if (pos.x > b.x) vel.x -= (pos.x - b.x) * k
    if (pos.x < -b.x) vel.x -= (pos.x + b.x) * k
    if (pos.y > b.yMax) vel.y -= (pos.y - b.yMax) * k
    if (pos.y < b.yMin) vel.y -= (pos.y - b.yMin) * k

    const speed = Math.hypot(vel.x, vel.y)
    if (speed > SHIP.maxSpeed) {
      vel.x *= SHIP.maxSpeed / speed
      vel.y *= SHIP.maxSpeed / speed
    }
    pos.x += vel.x * dt
    pos.y += vel.y * dt
    pos.z = SHIP.spawn.z + (reduced ? 0 : Math.sin(clock.elapsedTime * 1.3) * 0.25)

    // nose follows the direction of travel; bank into turns
    let turnRate = 0
    if (speed > 1.5) {
      const step = angleDelta(ship.heading, Math.atan2(vel.y, vel.x)) * (1 - Math.exp(-SHIP.turnRate * dt))
      ship.heading += step
      turnRate = step / dt
    }
    const bankTarget = Math.max(-SHIP.maxBank, Math.min(SHIP.maxBank, -turnRate * SHIP.bankAmount))
    ship.bank = damp(ship.bank, reduced ? bankTarget * 0.4 : bankTarget, 6, dt)
    ship.throttle = damp(ship.throttle, thrusting ? 1 : 0, 5, dt)

    body.position.copy(pos)
    body.rotation.set(0, 0, ship.heading)
    bank.rotation.x = ship.bank
    const reveal = Math.min(1, flight.reveal)
    body.visible = reveal > 0.02
    body.scale.setScalar(SHIP.scale * reveal)

    // --- proximity: nearest cluster in range (screen-plane distance) ----------
    let nearest: string | null = null
    if (flying) {
      let best = Infinity
      for (const c of clusters) {
        const d = Math.hypot(c.position[0] - pos.x, c.position[1] - pos.y)
        if (d < rangeOf(c) && d < best) {
          best = d
          nearest = c.id
        }
      }
    }
    galaxy.setProximity(nearest)

    // --- controls hint: hide after a while of flying, return when idle --------
    if (flying) {
      if (thrusting) {
        ship.flying += dt
        ship.idle = 0
      } else {
        ship.idle += dt
      }
      if (galaxy.hintVisible && ship.flying > SHIP.hint.hideAfterFlying) galaxy.setHintVisible(false)
      if (!galaxy.hintVisible && ship.idle > SHIP.hint.showAfterIdle) {
        ship.flying = 0
        galaxy.setHintVisible(true)
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[-30, 40, 60]} intensity={2.2} />
      <group ref={bodyRef}>
        <group ref={bankRef}>
          <ShipModel />
        </group>
      </group>
      <ShipTrail />
    </>
  )
}
