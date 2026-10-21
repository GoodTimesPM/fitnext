import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Icon, Macro, NumInput, Ring, Sheet, Swipe, Top, back, go } from '../components/ui.jsx'
import { MICROS, SOURCES, apiStatus, barcodeLookup, estimatedFood, factor, parseSpoken, photoEstimate, search, searchAll, totals, transcribe } from '../lib/food.js'
import { defaultUnit, entryText, qtyOf, unitText, unitsFor } from '../lib/units.js'
import { shiftDay, todayKey, useDay, useStore } from '../store.js'

// The attribution each source's terms ask for wherever its data is shown.
const CREDIT = {
  off: { text: 'Open Food Facts (ODbL)', url: 'https://world.openfoodfacts.org/' },
  usda: { text: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov/' },
  fatsecret: { text: 'Powered by fatsecret', url: 'https://www.fatsecret.com' },
  edamam: { text: 'Powered by Edamam', url: 'https://www.edamam.com' },
}

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
export const guessMeal = () => { const h = new Date().getHours(); return h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks' }
const kcalOf = e => (e.food.n.kcal || 0) * factor(e.food, e.qty)

export default function Fuel({ add, mode, q }) {
  return add ? <AddFood meal={add} mode={mode || 'search'} q={q} /> : <Diary />
}

// ---------- the day switcher ----------
export function dayName(date) {
  const t = todayKey()
  if (date === t) return 'Today'
  if (date === shiftDay(t, -1)) return 'Yesterday'
  if (date === shiftDay(t, 1)) return 'Tomorrow'
  return new Date(date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })
}

export function DayBar() {
  const { date, setDate } = useDay()
  const diary = useStore(s => s.diary)
  const d = new Date(date + 'T12:00')
  const monday = shiftDay(date, -((d.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i))
  const today = todayKey()
  return (
    <div className="daybar">
      <div className="row">
        <button className="icon-btn" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day"><Icon name="back" /></button>
        <div className="grow" style={{ textAlign: 'center' }}>
          <div className="day-name" key={date}>{dayName(date)}</div>
          <div className="small mu">{d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}</div>
        </div>
        <button className="icon-btn" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day"><Icon name="next" /></button>
      </div>
      <div className="week-strip">
        {week.map(k => (
          <button key={k} className={(k === date ? 'on' : '') + (k === today ? ' today' : '')} onClick={() => setDate(k)}>
            <span>{new Date(k + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            <b className="num">{+k.slice(8)}</b>
            <i style={{ opacity: diary[k]?.length ? 1 : 0 }} />
          </button>
        ))}
      </div>
      {date !== today && <button className="chip back-today" onClick={() => setDate(today)}>Back to today</button>}
    </div>
  )
}

// ---------- diary ----------
export function Diary() {
  const { date, dir, setDate } = useDay()
  const { diary, goals, removeFood, water, setWater, copyMeal } = useStore()
  const [micros, setMicros] = useState(false)
  const [edit, setEdit] = useState(null)
  const entries = diary[date] || []
  const yesterday = diary[shiftDay(date, -1)] || []
  const t = totals(entries)
  const left = goals.kcal - t.kcal

  return (
    <>
      <Top eyebrow="Food diary" title="Fuel" right={<button className="icon-btn" onClick={() => setMicros(true)} aria-label="Nutrients"><Icon name="chart" /></button>} />
      <DayBar />
      <Swipe k={date} dir={dir} onPrev={() => setDate(shiftDay(date, -1))} onNext={() => setDate(shiftDay(date, 1))}>
        <div className="card hero">
          <div className="row wrap" style={{ gap: 18, justifyContent: 'center' }}>
            <Ring value={t.kcal} max={goals.kcal} size={132} color={left < 0 ? 'var(--warn)' : 'var(--ac)'}>
              <div className="num" style={{ fontSize: 30 }}>{Math.abs(Math.round(left)).toLocaleString()}</div>
              <div className="small mu">{left < 0 ? 'over' : 'left'}</div>
            </Ring>
            <div className="stack" style={{ flex: '1 1 0', minWidth: 'max-content' }}>
              <Macro label="Protein" value={t.p} goal={goals.p} color="var(--p)" />
              <Macro label="Carbs" value={t.c} goal={goals.c} color="var(--c)" />
              <Macro label="Fat" value={t.f} goal={goals.f} color="var(--f)" />
            </div>
          </div>
          <div className="equation">
            <div><b className="num">{goals.kcal.toLocaleString()}</b><span>Goal</span></div><i>−</i>
            <div><b className="num">{Math.round(t.kcal).toLocaleString()}</b><span>Food</span></div><i>=</i>
            <div><b className="num" style={{ color: left < 0 ? 'var(--warn)' : 'var(--ac)' }}>{Math.round(left).toLocaleString()}</b><span>Left</span></div>
          </div>
        </div>

        <div className="quick">
          {[['search', 'Search', 'search'], ['scan', 'Scan', 'scan'], ['camera', 'Photo', 'photo'], ['mic', 'Voice', 'voice']].map(([icon, l, m]) => (
            <button key={l} onClick={() => go(`fuel/add/${m}?meal=${guessMeal()}`)}><Icon name={icon} /><span>{l}</span></button>
          ))}
        </div>

        {MEALS.map(meal => {
          const list = entries.filter(e => e.meal === meal)
          const mt = totals(list)
          const before = yesterday.filter(e => e.meal === meal)
          return (
            <div key={meal} className="card meal">
              <div className="card-h">
                <div><h3>{meal}</h3>{list.length > 0 && <div className="small mu num">P {Math.round(mt.p)} · C {Math.round(mt.c)} · F {Math.round(mt.f)}</div>}</div>
                <span className="num">{Math.round(mt.kcal)} <span className="small mu">kcal</span></span>
              </div>
              {list.map(e => {
                const k = kcalOf(e)
                return (
                  <div key={e.id} className="food-line">
                    <button className="grow" onClick={() => setEdit(e)}>
                      <div className="t">{e.food.name}</div>
                      <div className="s">{entryText(e)}{e.food.brand && ' · ' + e.food.brand}</div>
                    </button>
                    <div className="mini"><i style={{ width: Math.min(100, (k / Math.max(1, mt.kcal)) * 100) + '%' }} /></div>
                    <span className="num">{Math.round(k)}</span>
                    <button className="x" onClick={() => removeFood(date, e.id)} aria-label="Remove"><Icon name="x" size={16} /></button>
                  </div>
                )
              })}
              <div className="row wrap" style={{ gap: 8, marginTop: list.length ? 8 : 0 }}>
                <button className="add-food" onClick={() => go('fuel/add?meal=' + meal)}><Icon name="plus" size={16} />Add food</button>
                {!list.length && before.length > 0 && (
                  <button className="add-food" onClick={() => copyMeal(shiftDay(date, -1), date, meal)}><Icon name="copy" size={16} />Copy yesterday ({Math.round(totals(before).kcal)} kcal)</button>
                )}
              </div>
            </div>
          )
        })}

        <div className="card">
          <div className="card-h"><h3>Water</h3><span className="num mu">{((water[date] || 0) * 0.25).toFixed(2)} / {(goals.water * 0.25).toFixed(1)} L</span></div>
          <div className="drops">
            {Array.from({ length: Math.max(goals.water, (water[date] || 0) + 1) }, (_, i) => (
              <button key={i} className={i < (water[date] || 0) ? 'on' : ''} onClick={() => setWater(date, i < (water[date] || 0) ? i : i + 1)} aria-label={`${i + 1} glasses`}><Icon name="drop" size={26} /></button>
            ))}
          </div>
        </div>
      </Swipe>

      {micros && <Sheet onClose={() => setMicros(false)}><Nutrients /></Sheet>}
      {edit && <FoodSheet food={edit.food} meal={edit.meal} entry={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

// Macros and micronutrients for the day against targets. A sheet on phones, a panel on desktop.
export function Nutrients({ panel }) {
  const date = useDay(s => s.date)
  const { diary, goals } = useStore()
  const entries = diary[date] || []
  const t = totals(entries)
  const LIMIT = ['sodium', 'sugar', 'satfat', 'chol']
  // Which food gave the most of each nutrient that is over its limit.
  const top = k => entries.reduce((best, e) => { const v = (e.food.n[k] || 0) * factor(e.food, e.qty); return v > (best?.v || 0) ? { v, name: e.food.name } : best }, null)
  return (
    <>
      {panel ? <Top eyebrow={dayName(date)} title="Nutrients" /> : <h2 style={{ marginBottom: 12 }}>Nutrients · {dayName(date)}</h2>}
      <div className="card">
        {[['Calories', t.kcal, goals.kcal, 'var(--ac)', 'kcal'], ['Protein', t.p, goals.p, 'var(--p)', 'g'], ['Carbs', t.c, goals.c, 'var(--c)', 'g'], ['Fat', t.f, goals.f, 'var(--f)', 'g']].map(([n, v, g, c, u]) => (
          <div key={n} className="nu">
            <div className="row sb small"><span>{n}</span><span className="num mu">{Math.round(v).toLocaleString()} / {g.toLocaleString()} {u}</span></div>
            <Bar value={v} max={g} color={c} />
          </div>
        ))}
      </div>
      <div className="card">
        {MICROS.map(([k, name, unit, rdi]) => {
          const v = t[k] || 0
          const limit = LIMIT.includes(k)
          const met = !limit && v >= rdi
          return (
            <div key={k} className="nu">
              <div className="row sb small">
                <span>{name} {met && <span className="pill pr">Met</span>}{limit && v > rdi && <span className="pill" style={{ color: 'var(--warn)' }}>Over</span>}</span>
                <span className="num mu">{Math.round(v * 10) / 10} / {rdi} {unit}</span>
              </div>
              <Bar value={v} max={rdi} color={limit ? 'var(--f)' : met ? 'var(--ok)' : 'var(--ac)'} />
              {limit && v > rdi && top(k) && <div className="small mu" style={{ marginTop: 3 }}>Most from {top(k).name}</div>}
            </div>
          )
        })}
        <p className="small mu" style={{ marginBottom: 0 }}>Daily values are FDA reference amounts. Totals count foods whose source lists the nutrient (USDA is the most complete).</p>
      </div>
    </>
  )
}

// ---------- add food ----------
const MODES = [['search', 'Search'], ['scan', 'Scan'], ['photo', 'Photo'], ['voice', 'Voice'], ['saved', 'Saved']]

export function AddFood({ meal, mode, q }) {
  const [picked, setPicked] = useState(null)
  const date = useDay(s => s.date)
  return (
    <>
      <Top eyebrow={`Add to ${meal} · ${dayName(date)}`} title="Log food" onBack={() => back('fuel')} />
      <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {MEALS.map(m => <button key={m} className={'chip' + (m === meal ? ' on' : '')} onClick={() => location.replace(`#/fuel/add/${mode}?meal=${m}`)}>{m}</button>)}
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {MODES.map(([id, l]) => <button key={id} className={mode === id ? 'on' : ''} onClick={() => { location.replace(`#/fuel/add/${id}?meal=${meal}`) }}>{l}</button>)}
      </div>
      {mode === 'search' && <SearchFoods onPick={setPicked} initial={q} />}
      {mode === 'scan' && <Scan onPick={setPicked} />}
      {mode === 'photo' && <Photo meal={meal} />}
      {mode === 'voice' && <Voice meal={meal} />}
      {mode === 'saved' && <Saved onPick={setPicked} />}
      {picked && <FoodSheet food={picked} meal={meal} onClose={() => setPicked(null)} />}
    </>
  )
}

function FoodRow({ food, onPick }) {
  const u = defaultUnit(food)
  const kcal = (food.n.kcal || 0) * factor(food, qtyOf(food, u))
  return (
    <button className="li" onClick={() => onPick(food)}>
      <div className="grow">
        <div className="t" style={{ textTransform: 'none' }}>{food.name}</div>
        <div className="s">{[unitText(u), food.brand].filter(Boolean).join(' · ')}</div>
      </div>
      <span className="num small">{Math.round(kcal)} kcal</span>
    </button>
  )
}

const searchMemo = { q: '', results: [] }
function SearchFoods({ onPick, initial }) {
  const [q, setQ] = useState(initial || searchMemo.q)
  const [results, setResults] = useState(initial ? [] : searchMemo.results)
  const [state, setState] = useState('idle')
  const { diary, savedFoods } = useStore()
  const ran = useRef(initial ? '' : searchMemo.q)

  // Foods logged in the last 30 days, most recent first: what people log again most.
  const recent = useMemo(() => {
    const seen = new Map()
    Object.keys(diary).sort().reverse().slice(0, 30).forEach(d => [...diary[d]].reverse().forEach(e => { if (!seen.has(e.food.key)) seen.set(e.food.key, e.food) }))
    return [...seen.values()].slice(0, 12)
  }, [diary])

  const run = async (query = q) => {
    query = query.trim()
    if (!query || query === ran.current) return
    ran.current = query
    setState('loading')
    try {
      const r = await searchAll(query, list => { if (ran.current === query) { setResults(list); setState('more') } })
      if (ran.current !== query) return
      Object.assign(searchMemo, { q: query, results: r })
      setResults(r)
      setState(r.length ? 'idle' : 'none')
    } catch (e) { setState('error:' + e.message) }
  }
  // Search as you type, after a short pause.
  useEffect(() => {
    if (q.trim().length < 3) return
    const t = setTimeout(() => run(q), 600)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => { if (initial) { setQ(initial); run(initial) } }, [initial])

  const used = [...new Set(results.map(f => f.src))].filter(s => CREDIT[s])
  return (
    <>
      <form className="search" onSubmit={e => { e.preventDefault(); ran.current = ''; run() }}>
        <Icon name="search" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search any food: egg, greek yogurt, big mac…" enterKeyHint="search" autoFocus />
      </form>
      {!q.trim() && (
        <>
          {recent.length > 0 && <><div className="label">Recent</div><div className="list">{recent.map(f => <FoodRow key={f.key} food={f} onPick={onPick} />)}</div></>}
          {savedFoods.length > 0 && <><div className="label">Saved</div><div className="list">{savedFoods.slice(0, 8).map(f => <FoodRow key={f.key} food={f} onPick={onPick} />)}</div></>}
          {!recent.length && !savedFoods.length && <div className="empty">Search every food database at once. The closest match comes first.</div>}
        </>
      )}
      {q.trim() && (
        <>
          {state === 'loading' && <div className="empty">Searching…</div>}
          {state === 'none' && <div className="empty">Nothing found for “{q}”.</div>}
          {state.startsWith('error') && <div className="empty">{state.slice(6)}</div>}
          {results.length > 0 && state !== 'loading' && (
            <>
              <div className="list">{results.slice(0, 40).map(f => <FoodRow key={f.key} food={f} onPick={onPick} />)}</div>
              {state === 'more' && <div className="small mu" style={{ textAlign: 'center', marginBottom: 8 }}>Checking more sources…</div>}
              <p className="small mu credits">Data: {used.map((s, i) => <span key={s}>{i ? ' · ' : ''}<a href={CREDIT[s].url} target="_blank" rel="noreferrer">{CREDIT[s].text}</a></span>)}</p>
            </>
          )}
        </>
      )}
    </>
  )
}

// Pick an amount in any unit the food has; the diary keeps grams and remembers the unit.
function FoodSheet({ food, meal, entry, onClose }) {
  const date = useDay(s => s.date)
  const units = unitsFor(food)
  const [unit, setUnit] = useState(() => entry?.unit || (entry ? { label: 'g', g: 1, amt: entry.qty } : defaultUnit(food)))
  const { logFood, updateFood, toggleSaved, savedFoods } = useStore()
  const amt = +unit.amt || 0
  const qty = qtyOf(food, { ...unit, amt })
  const k = factor(food, qty)
  const saved = savedFoods.some(f => f.key === food.key)
  const micros = MICROS.filter(([key]) => food.n[key] != null)
  const pickUnit = u => {
    // Keep the same amount of food when switching units: 2 large eggs -> 100 g.
    const grams = unit.g ? amt * unit.g : null
    setUnit({ ...u, amt: grams && u.g && !food.perServing ? Math.round((grams / u.g) * 100) / 100 : 1 })
  }
  const save = () => {
    const u = { label: unit.label, g: unit.g, amt }
    if (entry) updateFood(date, entry.id, { qty, unit: u }); else logFood(date, meal, food, qty, u)
    onClose()
    if (!entry) go('fuel')
  }
  return (
    <Sheet onClose={onClose}>
      <div className="row sb" style={{ alignItems: 'flex-start' }}>
        <div><h2>{food.name}</h2><div className="small mu">{[food.brand, SOURCES[food.src]?.name || 'Estimate'].filter(Boolean).join(' · ')}</div></div>
        <button className="icon-btn" style={{ color: saved ? 'var(--f)' : undefined }} onClick={() => toggleSaved(food)} aria-label="Save food"><Icon name="star" /></button>
      </div>
      <div className="amount">
        <button className="icon-btn" onClick={() => setUnit({ ...unit, amt: Math.max(0, amt - (unit.g === 1 ? 10 : 0.5)) })} aria-label="Less">−</button>
        <input type="number" inputMode="decimal" value={unit.amt} onChange={e => setUnit({ ...unit, amt: e.target.value })} aria-label="Amount" />
        <button className="icon-btn" onClick={() => setUnit({ ...unit, amt: amt + (unit.g === 1 ? 10 : 0.5) })} aria-label="More"><Icon name="plus" /></button>
        <span className="grow mu">{unitText({ ...unit, amt }).replace(/^[\d.]+ /, '')}{unit.g > 1 && !food.perServing && <span className="small"> · {Math.round(qty)} g</span>}</span>
      </div>
      <div className="chips">
        {units.map(u => <button key={u.label} className={'chip' + (u.label === unit.label ? ' on' : '')} style={{ textTransform: 'none' }} onClick={() => pickUnit(u)}>{u.label}{u.g > 1 && u.label !== 'oz' && <span className="ct">{Math.round(u.g)} g</span>}</button>)}
      </div>
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', margin: '6px 0' }}>
        {[['kcal', 'kcal', 'var(--fg)'], ['p', 'protein', 'var(--p)'], ['c', 'carbs', 'var(--c)'], ['f', 'fat', 'var(--f)']].map(([key, l, col]) => (
          <div key={key}><div className="num" style={{ fontSize: 24, color: col }}>{Math.round((food.n[key] || 0) * k)}</div><div className="small mu">{l}</div></div>
        ))}
      </div>
      {micros.length > 0 && (
        <div className="small" style={{ marginTop: 14, columns: 2 }}>
          {micros.map(([key, name, u]) => <div key={key} className="row sb" style={{ padding: '3px 0' }}><span className="mu">{name}</span><span className="num">{Math.round(food.n[key] * k * 10) / 10} {u}</span></div>)}
        </div>
      )}
      <button className="btn block" style={{ marginTop: 16 }} disabled={!amt} onClick={save}>{entry ? 'Save' : `Add to ${meal}`}</button>
    </Sheet>
  )
}

function Saved({ onPick }) {
  const saved = useStore(s => s.savedFoods)
  return saved.length ? <div className="list">{saved.map(f => <FoodRow key={f.key} food={f} onPick={onPick} />)}</div>
    : <div className="empty">Star a food to keep it here.</div>
}

// ---------- barcode ----------
function Scan({ onPick }) {
  const video = useRef(null)
  const [code, setCode] = useState('')
  const [state, setState] = useState('BarcodeDetector' in window ? 'camera' : 'manual')
  const lookup = async c => {
    setState('loading')
    const food = await barcodeLookup(c)
    if (food) { onPick(food); setState('found') } else setState('missing')
  }
  useEffect(() => {
    if (state !== 'camera') return
    let stream, stop = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.current.srcObject = stream
        await video.current.play()
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        while (!stop) {
          const found = await det.detect(video.current).catch(() => [])
          if (found[0]) { setCode(found[0].rawValue); lookup(found[0].rawValue); break }
          await new Promise(r => setTimeout(r, 250))
        }
      } catch { setState('manual') }
    })()
    return () => { stop = true; stream?.getTracks().forEach(t => t.stop()) }
  }, [state])

  return (
    <>
      {state === 'camera' && <div className="media" style={{ aspectRatio: '4/3', background: '#000', marginBottom: 14 }}><video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
      {state === 'manual' && <p className="mu small">This browser has no barcode camera support (Chrome on Android and the app-store build do). Type the number under the barcode.</p>}
      <form className="row" onSubmit={e => { e.preventDefault(); lookup(code) }}>
        <input inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="Barcode number" />
        <button className="btn" disabled={code.length < 8}>Look up</button>
      </form>
      {state === 'loading' && <div className="empty">Looking up {code}…</div>}
      {state === 'missing' && <div className="empty">No source has {code}. Search by name instead.</div>}
      {['found', 'missing'].includes(state) && <button className="btn ghost block" onClick={() => setState('BarcodeDetector' in window ? 'camera' : 'manual')}>Scan another</button>}
    </>
  )
}

// ---------- photo ----------
async function shrink(file, max = 1024) {
  const img = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const c = Object.assign(document.createElement('canvas'), { width: img.width * s, height: img.height * s })
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return { url: c.toDataURL('image/jpeg', 0.85), data: c.toDataURL('image/jpeg', 0.85).split(',')[1] }
}

function EstimateList({ items, setItems, meal }) {
  const { logFood } = useStore()
  const [find, setFind] = useState(null)
  const [picked, setPicked] = useState(null)
  const chosen = items.filter(i => i.on)
  return (
    <>
      <div className="list">
        {items.map((it, i) => (
          <div key={i} className="li">
            <button className={'check' + (it.on ? ' on' : '')} onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}><Icon name="check" /></button>
            <div className="grow">
              <div className="t" style={{ textTransform: 'none' }}>{it.name}</div>
              <div className="s">{Math.round(it.kcal)} kcal · P {Math.round(it.p)} · C {Math.round(it.c)} · F {Math.round(it.f)}</div>
            </div>
            <NumInput value={Math.round(it.grams)} style={{ width: 74, textAlign: 'center' }} aria-label="grams"
              onValue={g => { if (!(g > 0)) return; const r = g / it.grams; setItems(items.map((x, j) => (j === i ? { ...x, grams: g, kcal: x.kcal * r, p: x.p * r, c: x.c * r, f: x.f * r } : x))) }} />
            <button className="icon-btn" title="Find in database" onClick={() => setFind(it.name)}><Icon name="search" /></button>
          </div>
        ))}
      </div>
      <button className="btn block" disabled={!chosen.length} onClick={() => { chosen.forEach(it => logFood(useDay.getState().date, meal, estimatedFood(it), it.grams)); go('fuel') }}>
        Log {chosen.length} item{chosen.length === 1 ? '' : 's'} to {meal}
      </button>
      {find && (
        <Sheet onClose={() => setFind(null)}>
          <SearchFoods initial={find} onPick={f => { setFind(null); setPicked(f) }} />
        </Sheet>
      )}
      {picked && <FoodSheet food={picked} meal={meal} onClose={() => setPicked(null)} />}
    </>
  )
}

function Photo({ meal }) {
  const [img, setImg] = useState(null)
  const [items, setItems] = useState(null)
  const [state, setState] = useState('idle')
  const [ok, setOk] = useState(null)
  useEffect(() => { apiStatus().then(s => setOk(!!s.gemini)) }, [])
  const onFile = async file => {
    if (!file) return
    const s = await shrink(file)
    setImg(s.url); setItems(null); setState('loading')
    try { setItems((await photoEstimate(s.data, 'image/jpeg')).items.map(i => ({ ...i, on: true }))); setState('done') } catch (e) { setState('error:' + e.message) }
  }
  if (ok === false) return <div className="empty">Photo logging needs GEMINI_API_KEY in .env (the free tier is enough to start).</div>
  return (
    <>
      <label className="card" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
        {img ? <img src={img} alt="" style={{ width: '100%', borderRadius: 14 }} /> : <><Icon name="camera" size={36} /><h3 style={{ marginTop: 8 }}>Take or choose a photo</h3><div className="small mu">Shoot from above, whole plate in frame</div></>}
        <input type="file" accept="image/*" capture="environment" hidden onChange={e => onFile(e.target.files[0])} />
      </label>
      {state === 'loading' && <div className="empty">Estimating weight and nutrition…</div>}
      {state.startsWith('error') && <div className="empty">{state.slice(6)}</div>}
      {items && <><p className="small mu">Estimates. Fix the grams, or tap search to swap in a database match.</p><EstimateList items={items} setItems={setItems} meal={meal} /></>}
    </>
  )
}

// ---------- voice ----------
function Voice({ meal }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [items, setItems] = useState(null)
  const [state, setState] = useState('idle')
  const [canRecord, setCanRecord] = useState(false)
  const rec = useRef(null)
  // Electron exposes webkitSpeechRecognition but it has no speech service behind it, so the desktop
  // app records audio instead and Gemini transcribes it.
  const Rec = !/Electron/.test(navigator.userAgent) && (window.SpeechRecognition || window.webkitSpeechRecognition)
  useEffect(() => { if (!Rec && navigator.mediaDevices && window.MediaRecorder) apiStatus().then(s => setCanRecord(!!s.gemini)) }, [Rec])

  const listen = () => {
    if (listening) { rec.current?.stop(); return }
    const r = new Rec()
    r.lang = navigator.language || 'en-US'
    r.interimResults = true
    r.continuous = true
    r.onresult = e => setText([...e.results].map(x => x[0].transcript).join(' '))
    r.onend = () => setListening(false)
    r.start()
    rec.current = r
    setListening(true)
  }

  const record = async () => {
    if (listening) { rec.current?.stop(); return }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const r = new MediaRecorder(stream)
    const chunks = []
    r.ondataavailable = e => chunks.push(e.data)
    r.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setListening(false); setState('transcribing')
      try {
        const blob = new Blob(chunks, { type: r.mimeType })
        const b64 = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result.split(',')[1]); fr.readAsDataURL(blob) })
        setText((await transcribe(b64, r.mimeType.split(';')[0])).text || ''); setState('idle')
      } catch (e) { setState('error:' + e.message) }
    }
    r.start()
    rec.current = r
    setListening(true)
  }
  const mic = Rec ? listen : canRecord ? record : null

  // The model splits the sentence into foods and grams; each is then matched to a database entry
  // (USDA when available: generic foods, the kind people say out loud) so the numbers are real.
  const parse = async () => {
    setState('loading')
    try {
      const s = await apiStatus()
      const parts = s.gemini ? (await parseSpoken(text)).items
        : text.split(/,|\band\b|\bwith\b/i).map(x => x.trim()).filter(Boolean).map(name => ({ name, grams: 100 }))
      const src = s.usda ? 'usda' : 'off'
      const matched = await Promise.all(parts.map(async it => {
        const food = (await search(src, it.name).catch(() => []))[0]
        if (!food) return null
        const k = factor(food, food.perServing ? 1 : it.grams)
        return { name: food.name, grams: food.perServing ? food.serving.g || 100 : it.grams, kcal: (food.n.kcal || 0) * k, p: (food.n.p || 0) * k, c: (food.n.c || 0) * k, f: (food.n.f || 0) * k, on: true, said: it.name }
      }))
      setItems(matched.filter(Boolean)); setState('done')
    } catch (e) { setState('error:' + e.message) }
  }

  return (
    <>
      <div className="card" style={{ textAlign: 'center' }}>
        {mic ? (
          <button onClick={mic} style={{ width: 84, height: 84, borderRadius: '50%', background: listening ? 'var(--warn)' : 'var(--ac)', color: 'var(--acf)', display: 'grid', placeItems: 'center', margin: '6px auto 12px', transition: 'background .25s', animation: listening ? 'enter 1s ease-in-out infinite alternate' : undefined }}>
            <Icon name="mic" size={34} />
          </button>
        ) : <p className="small mu">No speech recognition here. Type what you ate, or add GEMINI_API_KEY to record instead.</p>}
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder={'"Two eggs, a slice of whole wheat toast and a black coffee"'} />
        <button className="btn block" style={{ marginTop: 10 }} disabled={!text.trim()} onClick={parse}>Find foods</button>
      </div>
      {state === 'transcribing' && <div className="empty">Transcribing…</div>}
      {state === 'loading' && <div className="empty">Matching foods…</div>}
      {state.startsWith('error') && <div className="empty">{state.slice(6)}</div>}
      {items && <EstimateList items={items} setItems={setItems} meal={meal} />}
    </>
  )
}
