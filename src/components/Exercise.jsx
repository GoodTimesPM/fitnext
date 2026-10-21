import { useState } from 'react'
import BodyMap from './BodyMap.jsx'
import { animSrc } from '../lib/catalogue.js'
import { useStore } from '../store.js'

// The exercise's animation (Open Exercise Figures, CC0) or, when it has none, the body map
// with its target and supporting muscles shaded.
export function ExerciseMedia({ ex, height = 300, still = false }) {
  const figure = useStore(s => s.settings.figure)
  const [failed, setFailed] = useState(false)
  const src = animSrc(ex)
  if (src && !failed) {
    return (
      <div className="media" style={{ height: still ? undefined : height }}>
        <img src={src} alt={ex.n} loading="lazy" onError={() => setFailed(true)} />
      </div>
    )
  }
  return (
    <div className="media fallback" style={{ height }}>
      <BodyMap primary={ex.p} secondary={ex.s} figure={figure} height={height - 36} />
    </div>
  )
}

export function ExerciseThumb({ ex, big }) {
  const figure = useStore(s => s.settings.figure)
  const src = animSrc(ex)
  return (
    <div className={'thumb' + (big ? ' big' : '')} style={src ? { background: '#fff' } : { padding: 4 }}>
      {src ? <img src={src} alt="" loading="lazy" /> : <BodyMap primary={ex.p} secondary={ex.s} figure={figure} height={big ? 120 : 48} />}
    </div>
  )
}
