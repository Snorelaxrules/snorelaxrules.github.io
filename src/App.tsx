import { motion } from 'motion/react'

export default function App() {
  return (
    <main
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(ellipse at 50% 40%, rgb(122 224 255 / 0.08), transparent 60%), var(--bg)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--accent)' }}>Talus Leong</h1>
        <p style={{ color: 'var(--fg-muted)' }}>Systems initializing. Launch sequence pending.</p>
      </motion.div>
    </main>
  )
}
