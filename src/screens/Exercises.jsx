import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, Top, back, go } from '../components/ui.jsx'
import BodyMap from '../components/BodyMap.jsx'
import { ExerciseThumb } from '../components/Exercise.jsx'
import { BODY_PARTS, CATEGORIES, catalogue, countsOf, searchExercises } from '../lib/catalogue.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { useStore } from '../store.js'

// Kept across visits, so opening an exercise and coming back lands where you were.
const memo = { q: '', bp: null, cat: null, eq: null, muscle: null, animated: false, view: 'list', shown: 60 }

export default function Exercises({ pick, muscle }) {
  // Arriving from the stats body map: show that muscle's exercises and nothing else.
  const [f, setF] = useState(() => (muscle ? Object.assign(memo, { q: '', bp: null, cat: null, eq: null, animated: false, muscle, view: 'muscle', shown: 60 }) : memo, { ...memo }))
  const set = patch => { Object.assign(memo, patch, { shown: 60 }); setF({ ...memo }) }
  const addToWorkout = useStore(s => s.addToWorkout)
  const figure = useStore(s => s.settings.figure)
  const layout = useStore(s => s.settings.exView)
  const setSetting = useStore(s => s.setSetting)
  const all = catalogue()

  // Each chip row counts what the other filters leave, so no chip leads to an empty list.
  const filtered = useMemo(() => {
    const by = skip => all.filter(e =>
      (skip === 'bp' || !f.bp || e.bp === f.bp) &&
      (skip === 'cat' || !f.cat || e.cat === f.cat) &&
      (skip === 'eq' || !f.eq || e.eq === f.eq) &&
      (!f.muscle || e.p.includes(f.muscle) || e.s.includes(f.muscle)) &&
      (!f.animated || e.a))
    return { bp: by('bp'), cat: by('cat'), eq: by('eq'), all: by(null) }
  }, [all, f.bp, f.cat, f.eq, f.muscle, f.animated])

  const results = useMemo(() => {
    let list = searchExercises(filtered.all, f.q)
    // By muscle: the exercises that train it as their target come before those that only involve it.
    if (f.muscle && !f.q) list = [...list.filter(e => e.p.includes(f.muscle)), ...list.filter(e => !e.p.includes(f.muscle))]
    return list
  }, [filtered.all, f.q, f.muscle])

  const [shown, setShown] = useState(memo.shown)
  useEffect(() => setShown(memo.shown), [results])
  const sentinel = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(([en]) => en.isIntersecting && setShown(n => (memo.shown = Math.min(n + 60, results.length))), { rootMargin: '600px' })
    if (sentinel.current) io.observe(sentinel.current)
    return () => io.disconnect()
  }, [results])

  const bpCounts = Object.fromEntries(countsOf(filtered.bp, 'bp'))
  const catCounts = Object.fromEntries(countsOf(filtered.cat, 'cat'))
  const eqCounts = countsOf(filtered.eq, 'eq')
  const animatedCount = all.filter(e => e.a).length

  const add = e => {
    addToWorkout(e.id)
    if (pick) go('train/workout')
  }

  return (
    <>
      <Top eyebrow={`${all.length.toLocaleString()} exercises · ${animatedCount.toLocaleString()} animated`} title={pick ? 'Add exercise' : 'Exercises'}
        onBack={() => back('train')} />

      <div className="search">
        <Icon name="search" />
        <input value={f.q} onChange={e => set({ q: e.target.value })} placeholder="Search: bench, rdl, db curl, pullup…" autoFocus={pick} />
      </div>

      <div className="row wrap" style={{ marginBottom: 12 }}>
        <div className="seg" style={{ flex: 1 }}>
          <button className={f.view === 'list' ? 'on' : ''} onClick={() => set({ view: 'list' })}>Filters</button>
          <button className={f.view === 'muscle' ? 'on' : ''} onClick={() => set({ view: 'muscle' })}>By muscle</button>
        </div>
        <button className={'chip' + (f.animated ? ' on' : '')} onClick={() => set({ animated: !f.animated })}>Animated</button>
        <button className="icon-btn" onClick={() => setSetting('exView', layout === 'grid' ? 'list' : 'grid')} aria-label={layout === 'grid' ? 'List view' : 'Grid view'} title={layout === 'grid' ? 'List view' : 'Grid view'}>
          <Icon name={layout === 'grid' ? 'list' : 'grid'} />
        </button>
      </div>

      {f.view === 'muscle' ? (
        <div className="card">
          <BodyMap figure={figure} selected={f.muscle ? [f.muscle] : []} onPick={m => set({ muscle: f.muscle === m ? null : m })} height={280} />
          <div className="legend">{f.muscle ? <span>Showing <b style={{ color: 'var(--fg)' }}>{MUSCLE_NAME[f.muscle]}</b>, tap again to clear</span> : <span>Tap a muscle</span>}</div>
        </div>
      ) : (
        <>
          <div className="chips">
            <button className={'chip' + (!f.bp ? ' on' : '')} onClick={() => set({ bp: null })}>All parts</button>
            {BODY_PARTS.filter(b => bpCounts[b]).map(b => (
              <button key={b} className={'chip' + (f.bp === b ? ' on' : '')} onClick={() => set({ bp: f.bp === b ? null : b })}>{b}<span className="ct">{bpCounts[b]}</span></button>
            ))}
          </div>
          <div className="chips">
            <button className={'chip' + (!f.cat ? ' on' : '')} onClick={() => set({ cat: null })}>All types</button>
            {CATEGORIES.filter(c => catCounts[c]).map(c => (
              <button key={c} className={'chip' + (f.cat === c ? ' on' : '')} onClick={() => set({ cat: f.cat === c ? null : c })}>{c}<span className="ct">{catCounts[c]}</span></button>
            ))}
          </div>
          <div className="chips">
            <button className={'chip' + (!f.eq ? ' on' : '')} onClick={() => set({ eq: null })}>All equipment</button>
            {eqCounts.map(([eq, n]) => (
              <button key={eq} className={'chip' + (f.eq === eq ? ' on' : '')} onClick={() => set({ eq: f.eq === eq ? null : eq })}>{eq}<span className="ct">{n}</span></button>
            ))}
          </div>
        </>
      )}

      <div className="row sb small mu" style={{ margin: '4px 2px 8px' }}>
        <span>{results.length.toLocaleString()} results{f.muscle && ` · ${MUSCLE_NAME[f.muscle]}`}</span>
        {(f.bp || f.cat || f.eq || f.muscle || f.q || f.animated) && <button className="small" style={{ color: 'var(--ac)' }} onClick={() => set({ q: '', bp: null, cat: null, eq: null, muscle: null, animated: false })}>Clear all</button>}
      </div>

      {results.length > 0 && layout === 'grid' && (
        <div className="tiles">
          {results.slice(0, shown).map(e => (
            <div key={e.id} className="tile">
              <button onClick={() => go('exercise/' + e.id)} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                <ExerciseThumb ex={e} big />
                <div className="t">{e.n}</div>
                <div className="s cap">{e.tg} · {e.eq}</div>
              </button>
              <button className="icon-btn add" onClick={() => add(e)} aria-label="Add to workout" title="Add to workout"><Icon name="plus" /></button>
            </div>
          ))}
        </div>
      )}
      {results.length > 0 && layout !== 'grid' && (
        <div className="list">
          {results.slice(0, shown).map(e => (
            <div key={e.id} className="li">
              <button className="row grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => go('exercise/' + e.id)}>
                <ExerciseThumb ex={e} />
                <div className="grow">
                  <div className="t">{e.n}</div>
                  <div className="s cap">{e.tg} · {e.eq}</div>
                </div>
              </button>
              <button className="icon-btn" onClick={() => add(e)} aria-label="Add to workout" title="Add to workout"><Icon name="plus" /></button>
            </div>
          ))}
        </div>
      )}
      {!results.length && <div className="empty">No exercises match. Try fewer filters.</div>}
      <div ref={sentinel} />
    </>
  )
}
