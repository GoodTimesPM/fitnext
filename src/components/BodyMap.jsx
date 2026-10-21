import { useEffect, useState } from 'react'

// Front and back anatomical body map (MuscleMap by Melih Colpan, MIT; via openGym).
// Shading: `heat` maps muscle -> 0..1, or `primary` / `secondary` lists for one exercise.
// `onPick` makes muscles tappable; `selected` outlines the picked ones.

let pathsPromise
const loadPaths = () => (pathsPromise ||= import('../lib/body-paths.js').then(m => m.default))

const INERT = new Set(['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'])

export default function BodyMap({ heat, primary = [], secondary = [], selected = [], onPick, figure = 'male', height = 260 }) {
  const [paths, setPaths] = useState(null)
  useEffect(() => { loadPaths().then(setPaths) }, [])
  if (!paths) return <div style={{ height }} />

  const fill = part => {
    if (INERT.has(part)) return 'var(--sf2)'
    if (heat) {
      const v = heat[part] || 0
      return v ? `color-mix(in srgb, var(--ac) ${Math.round(18 + v * 82)}%, var(--sf2))` : 'color-mix(in srgb, var(--fg) 9%, var(--sf2))'
    }
    if (primary.includes(part)) return 'var(--ac)'
    if (secondary.includes(part)) return 'color-mix(in srgb, var(--ac) 50%, var(--sf2))'
    if (selected.includes(part)) return 'var(--ac)'
    return 'color-mix(in srgb, var(--fg) 9%, var(--sf2))'
  }

  return (
    <div className="bodymap" style={{ height }}>
      {['front', 'back'].map(side => {
        const view = paths[figure][side]
        return (
          <svg key={side} viewBox={view.vb} className={onPick ? 'tap' : ''} aria-label={side + ' view'}>
            {Object.entries(view.p).map(([part, ds]) => (
              <g key={part} onClick={onPick && !INERT.has(part) ? () => onPick(part) : undefined}>
                {ds.map((d, i) => (
                  <path key={i} d={d} fill={fill(part)}
                    stroke={selected.includes(part) ? 'var(--fg)' : 'var(--bg)'} strokeWidth={selected.includes(part) ? 5 : 2}>
                    {!INERT.has(part) && <title>{part}</title>}
                  </path>
                ))}
              </g>
            ))}
          </svg>
        )
      })}
    </div>
  )
}
