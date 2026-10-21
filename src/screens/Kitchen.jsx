import { useEffect, useMemo, useState } from 'react'
import { Icon, Seg, Sheet, Top, fmtDate, go } from '../components/ui.jsx'
import { apiStatus, importRecipe, mealdb, recipeNutrition, recipeSearch, totals } from '../lib/food.js'
import { guessMeal } from './Fuel.jsx'
import { todayKey, useDay, useStore } from '../store.js'

// Recipes: your saved ones, a free library with photos to import from (TheMealDB), any recipe
// page by link, and Spoonacular's "fits today" search when keyed. Plus the grocery list.
export default function Kitchen({ tab: initial, open, noGrocery }) {
  const [tab, setTab] = useState(initial || 'mine')
  useEffect(() => { if (initial) setTab(initial) }, [initial])
  const recipes = useStore(s => s.recipes)
  const [shown, setShown] = useState(null)
  useEffect(() => { if (open) setShown(recipes.find(r => r.id === open) || null) }, [open])
  const tabs = [['mine', `My recipes${recipes.length ? ' · ' + recipes.length : ''}`], ['discover', 'Discover'], ...(noGrocery ? [] : [['grocery', 'Grocery']])]
  return (
    <>
      <Top eyebrow="Plan what you eat" title="Kitchen" />
      <Seg value={tab === 'grocery' && noGrocery ? 'mine' : tab} onChange={setTab} options={tabs} style={{ marginBottom: 14 }} />
      {tab === 'mine' && <MyRecipes onOpen={setShown} onDiscover={() => setTab('discover')} />}
      {tab === 'discover' && <Discover onOpen={setShown} />}
      {tab === 'grocery' && !noGrocery && <Grocery />}
      {shown && <RecipeSheet recipe={shown} onClose={() => setShown(null)} />}
    </>
  )
}

// Categories that make a good starter set: about 90 recipes with photos.
const STARTER = ['Breakfast', 'Chicken', 'Vegetarian', 'Seafood', 'Pasta', 'Beef']

function MyRecipes({ onOpen, onDiscover }) {
  const { recipes, saveRecipes } = useStore()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState(null)
  const [url, setUrl] = useState('')
  const [state, setState] = useState('')
  const tags = useMemo(() => {
    const n = {}
    recipes.forEach(r => (r.tags || []).slice(0, 2).forEach(t => (n[t] = (n[t] || 0) + 1)))
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 14)
  }, [recipes])
  const list = recipes.filter(r => (!tag || r.tags?.includes(tag)) && (!q || (r.title + ' ' + r.ingredients.join(' ')).toLowerCase().includes(q.toLowerCase())))

  const fromLink = async e => {
    e.preventDefault()
    if (!url.trim()) return
    setState('Importing…')
    try {
      const r = await importRecipe(url.trim())
      saveRecipes([r]); setUrl(''); setState(`Added ${r.title}`)
    } catch (err) { setState(err.message) }
  }
  const starter = async () => {
    setState('Importing recipes with photos… this takes a few seconds')
    let n = 0
    for (const c of STARTER) {
      try { const got = await mealdb('search', { c }); saveRecipes(got); n += got.length; setState(`Imported ${n} recipes…`) } catch { /* next category */ }
    }
    setState(n ? `Imported ${n} recipes` : 'Could not reach the recipe library')
  }

  return (
    <>
      <form className="import" onSubmit={fromLink}>
        <Icon name="link" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a recipe link to import it" inputMode="url" />
        <button className="btn sm" disabled={!url.trim()}>Import</button>
      </form>
      {state && <div className="small mu" style={{ margin: '-4px 4px 12px' }}>{state}</div>}

      {!recipes.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <Icon name="book" size={34} />
          <h2 style={{ margin: '8px 0 4px' }}>Start your cookbook</h2>
          <p className="mu" style={{ marginTop: 0 }}>Import about 90 recipes with photos, ingredients and steps, from breakfast to beef. Or browse Discover and pick.</p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={starter}><Icon name="plus" />Import starter recipes</button>
            <button className="btn ghost" onClick={onDiscover}>Browse</button>
          </div>
        </div>
      ) : (
        <>
          <div className="search"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your recipes or ingredients" /></div>
          {tags.length > 1 && (
            <div className="chips">
              <button className={'chip' + (!tag ? ' on' : '')} onClick={() => setTag(null)}>All</button>
              {tags.map(([t, n]) => <button key={t} className={'chip' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? null : t)}>{t}<span className="ct">{n}</span></button>)}
            </div>
          )}
          <RecipeGrid list={list} onOpen={onOpen} />
          {!list.length && <div className="empty">No recipes match.</div>}
        </>
      )}
    </>
  )
}

export function RecipeGrid({ list, onOpen, saved }) {
  return (
    <div className="recipes">
      {list.map(r => (
        <button key={r.id || r.source} className="recipe" onClick={() => onOpen(r)}>
          <div className="img">{r.image ? <img src={r.image + (r.source?.startsWith('mealdb') ? '/medium' : '')} alt="" loading="lazy" /> : <Icon name="book" />}
            {saved?.has(r.source) && <span className="pill ac saved"><Icon name="check" size={11} /> Saved</span>}
          </div>
          <div className="body">
            <h3>{r.title}</h3>
            <div className="small mu">{[r.kcal && `${Math.round(r.kcal)} kcal`, r.p && `${Math.round(r.p)} g protein`, r.mins && `${r.mins} min`].filter(Boolean).join(' · ') || (r.tags || []).slice(0, 2).join(' · ')}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

const memo = { cat: null, list: null, q: '' }
function Discover({ onOpen }) {
  const { recipes, saveRecipes, diary, goals } = useStore()
  const [cats, setCats] = useState(null)
  const [cat, setCat] = useState(memo.cat)
  const [list, setList] = useState(memo.list)
  const [q, setQ] = useState(memo.q)
  const [state, setState] = useState('')
  const [spoon, setSpoon] = useState(false)
  const saved = new Set(recipes.map(r => r.source))
  useEffect(() => { mealdb('categories').then(setCats).catch(e => setState(e.message)); apiStatus().then(s => setSpoon(!!s.spoonacular)) }, [])

  const load = async (params, label) => {
    setState('loading'); setList(null)
    try {
      const r = await params()
      Object.assign(memo, { list: r, cat: label }); setList(r); setCat(label); setState(r.length ? '' : 'Nothing found')
    } catch (e) { setState(e.message) }
  }
  const fits = () => {
    const t = totals(diary[todayKey()] || [])
    const left = { kcal: Math.max(0, goals.kcal - t.kcal), p: Math.max(0, goals.p - t.p) }
    load(() => recipeSearch({ q, maxKcal: Math.round(left.kcal) || undefined, minProtein: Math.round(left.p / 3) || undefined })
      .then(rs => rs.map(r => ({ ...r, source: 'spoon:' + r.id, id: undefined, tags: [] }))), `Fits today: ≤ ${Math.round(left.kcal)} kcal`)
  }
  const fresh = (list || []).filter(r => !saved.has(r.source))

  return (
    <>
      <form className="search" onSubmit={e => { e.preventDefault(); memo.q = q; if (q.trim()) load(() => mealdb('search', { q: q.trim() }), `“${q.trim()}”`) }}>
        <Icon name="search" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search recipes: curry, salmon, pancakes…" />
      </form>
      {spoon && <button className="chip" style={{ textTransform: 'none', marginBottom: 12 }} onClick={fits}>Recipes that fit what's left today</button>}

      {cat ? (
        <>
          <div className="row sb" style={{ margin: '0 2px 12px' }}>
            <button className="row small" style={{ gap: 6, color: 'var(--ac)' }} onClick={() => { setCat(null); setList(null); Object.assign(memo, { cat: null, list: null }) }}><Icon name="back" size={16} />Categories</button>
            {fresh.length > 0 && <button className="btn sm" onClick={() => saveRecipes(fresh)}><Icon name="plus" />Save all {fresh.length}</button>}
          </div>
          <h2 style={{ margin: '0 2px 12px' }}>{cat}</h2>
          {state === 'loading' ? <div className="empty">Loading recipes…</div> : state ? <div className="empty">{state}</div> : null}
          {list && <RecipeGrid list={list} onOpen={onOpen} saved={saved} />}
        </>
      ) : (
        <>
          {!cats && !state && <div className="empty">Loading…</div>}
          {state && !cats && <div className="empty">{state}</div>}
          <div className="cats">
            {(cats || []).map(c => (
              <button key={c.name} className="cat" onClick={() => load(() => mealdb('search', { c: c.name }), c.name)}>
                <img src={c.image} alt="" loading="lazy" /><span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="small mu credits">Recipes and photos from <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">TheMealDB</a>{spoon && <> and <a href="https://spoonacular.com/food-api" target="_blank" rel="noreferrer">Spoonacular</a></>}.</p>
    </>
  )
}

function RecipeSheet({ recipe, onClose }) {
  const { recipes, saveRecipes, updateRecipe, deleteRecipe, addGrocery, logFood } = useStore()
  const mine = recipes.find(r => (recipe.id && r.id === recipe.id) || (recipe.source && r.source === recipe.source))
  const r = mine || recipe
  const [state, setState] = useState('')
  const [gem, setGem] = useState(false)
  const [manual, setManual] = useState(null)
  useEffect(() => { apiStatus().then(s => setGem(!!s.gemini)) }, [])
  const hasN = r.kcal != null

  const estimate = async () => {
    setState('Estimating…')
    try {
      const n = await recipeNutrition(r)
      if (mine) updateRecipe(mine.id, n); else saveRecipes([{ ...r, ...n }])
      setState('')
    } catch (e) { setState(e.message) }
  }
  const log = () => {
    const food = { key: 'recipe:' + (r.source || r.id), src: 'recipe', name: r.title, brand: '', perServing: true, serving: { label: 'serving', g: null }, n: { kcal: r.kcal, p: r.p, c: r.c, f: r.f } }
    const date = useDay.getState().date
    logFood(date, guessMeal(), food, 1, { label: 'serving', g: null, amt: 1 })
    setState(`Logged 1 serving to ${guessMeal()}`)
  }

  return (
    <Sheet onClose={onClose}>
      {r.image && <img src={r.image} alt="" className="recipe-hero" />}
      <div className="small mu">{[...(r.tags || []).slice(0, 3), r.mins && `${r.mins} min`, r.servings && `serves ${r.servings}`].filter(Boolean).join(' · ')}</div>
      <h2 style={{ fontSize: 24, margin: '2px 0 10px' }}>{r.title}</h2>
      {hasN ? (
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', margin: '4px 0 14px' }}>
          {[['kcal', 'kcal', 'var(--fg)'], ['p', 'protein', 'var(--p)'], ['c', 'carbs', 'var(--c)'], ['f', 'fat', 'var(--f)']].map(([k, l, col]) => (
            <div key={k}><div className="num" style={{ fontSize: 22, color: col }}>{Math.round(r[k] || 0)}</div><div className="small mu">{l}</div></div>
          ))}
        </div>
      ) : (
        <div className="card tight" style={{ background: 'var(--sf)' }}>
          <div className="row sb">
            <span className="small mu">No nutrition listed for this recipe.</span>
            <div className="row" style={{ gap: 6 }}>
              {gem && <button className="btn sm" onClick={estimate}>Estimate</button>}
              <button className="btn sm ghost" onClick={() => setManual(manual ? null : { kcal: '', p: '', c: '', f: '' })}>Enter it</button>
            </div>
          </div>
          {manual && (
            <form className="row" style={{ gap: 6, marginTop: 10 }} onSubmit={e => {
              e.preventDefault()
              const n = Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, +v || 0]))
              if (mine) updateRecipe(mine.id, n); else saveRecipes([{ ...r, ...n }])
              setManual(null)
            }}>
              {[['kcal', 'kcal'], ['p', 'protein'], ['c', 'carbs'], ['f', 'fat']].map(([k, l]) => (
                <input key={k} type="number" inputMode="decimal" placeholder={l} value={manual[k]} onChange={e => setManual({ ...manual, [k]: e.target.value })} style={{ padding: '8px 10px' }} />
              ))}
              <button className="btn sm">Save</button>
            </form>
          )}
        </div>
      )}
      {state && <div className="small" style={{ color: 'var(--ac)', marginBottom: 10 }}>{state}</div>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {!mine && <button className="btn sm" onClick={() => saveRecipes([r])}><Icon name="bookmark" />Save</button>}
        {hasN && <button className="btn sm" onClick={log}><Icon name="plus" />Log a serving</button>}
        <button className="btn sm ghost" onClick={() => { addGrocery(r.ingredients); setState('Ingredients added to the grocery list') }}><Icon name="kitchen" />Add to grocery</button>
        {r.url && <a className="btn sm ghost" href={r.url} target="_blank" rel="noreferrer"><Icon name="link" />Source</a>}
        {mine && <button className="btn sm danger" onClick={() => { deleteRecipe(mine.id); onClose() }}><Icon name="trash" /></button>}
      </div>
      <h3>Ingredients</h3>
      <ul className="ingredients">{r.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {r.steps?.length > 0 && (
        <>
          <h3 style={{ marginTop: 14 }}>Steps</h3>
          <ol className="steps">{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </>
      )}
    </Sheet>
  )
}

// ---------- grocery ----------
// Rough supermarket aisles by keyword, so the list reads in the order you walk the shop.
const AISLES = [
  ['Produce', /apple|banana|berr|lemon|lime|orange|grape|melon|avocado|tomato|potato|onion|garlic|ginger|carrot|celery|pepper(?!corn)|chil+i|lettuce|spinach|kale|cabbage|broccoli|cauliflower|cucumber|courgette|zucchini|mushroom|herb|parsley|coriander|cilantro|basil|mint|thyme|rosemary|leek|spring onion|scallion|squash|pumpkin|aubergine|eggplant|bean sprout|fruit|veg/i],
  ['Meat & fish', /chicken|beef|pork|lamb|turkey|bacon|sausage|ham|mince|steak|fish|salmon|tuna|cod|prawn|shrimp|crab|anchov|chorizo/i],
  ['Dairy & eggs', /milk|cheese|butter|yog|cream|egg|parmesan|mozzarella|feta|cheddar/i],
  ['Bakery', /bread|bun|roll|tortilla|pitta|pita|bagel|naan|wrap/i],
  ['Frozen', /frozen|ice cream|peas/i],
  ['Pantry', /flour|sugar|salt|pepper|oil|vinegar|rice|pasta|noodle|spaghetti|oat|bean|lentil|chickpea|stock|broth|sauce|paste|spice|cumin|paprika|cinnamon|honey|syrup|nut|seed|tin|can|soy|mustard|ketchup|mayo|cocoa|chocolate|baking|yeast|vanilla|cereal/i],
]
const aisleOf = t => AISLES.find(([, re]) => re.test(t))?.[0] || 'Other'

export function Grocery() {
  const { grocery, lists, addGrocery, toggleGrocery, removeGrocery, clearGrocery, saveList, loadList, deleteList } = useStore()
  const [tab, setTab] = useState('list')
  const [text, setText] = useState('')
  const [naming, setNaming] = useState(null)
  const [note, setNote] = useState('')
  const open = grocery.filter(g => !g.done)
  const done = grocery.filter(g => g.done)
  const groups = useMemo(() => {
    const by = {}
    open.forEach(g => (by[aisleOf(g.text)] ||= []).push(g))
    return [...AISLES.map(a => a[0]), 'Other'].filter(a => by[a]).map(a => [a, by[a]])
  }, [grocery])
  const Item = ({ g }) => (
    <div className="li">
      <button className={'check' + (g.done ? ' on' : '')} onClick={() => toggleGrocery(g.id)} aria-label="Check"><Icon name="check" /></button>
      <button className="grow" style={{ textAlign: 'left', textDecoration: g.done ? 'line-through' : 'none', color: g.done ? 'var(--mu)' : undefined }} onClick={() => toggleGrocery(g.id)}>{g.text}</button>
      <button className="x" onClick={() => removeGrocery(g.id)} aria-label="Remove" style={{ color: 'var(--mu)' }}><Icon name="x" size={16} /></button>
    </div>
  )

  return (
    <>
      <Seg value={tab} onChange={setTab} options={[['list', `List${open.length ? ' · ' + open.length : ''}`], ['saved', `Saved lists${lists.length ? ' · ' + lists.length : ''}`]]} style={{ marginBottom: 14 }} />
      {tab === 'list' ? (
        <>
          <form className="row" style={{ marginBottom: 14 }} onSubmit={e => { e.preventDefault(); if (text.trim()) { addGrocery(text.split(',').map(x => x.trim()).filter(Boolean)); setText('') } }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Add items, comma separated" />
            <button className="btn" aria-label="Add"><Icon name="plus" /></button>
          </form>
          {groups.map(([aisle, items]) => (
            <div key={aisle}>
              <div className="label">{aisle}</div>
              <div className="list">{items.map(g => <Item key={g.id} g={g} />)}</div>
            </div>
          ))}
          {done.length > 0 && (<><div className="label">Checked</div><div className="list">{done.map(g => <Item key={g.id} g={g} />)}</div></>)}
          {!grocery.length && <div className="empty">Add items, load a saved list, or add a recipe's ingredients.</div>}
          {note && <div className="small" style={{ color: 'var(--ac)', margin: '0 4px 10px' }}>{note}</div>}
          {grocery.length > 0 && (naming != null ? (
            <form className="row" style={{ marginBottom: 10 }} onSubmit={e => { e.preventDefault(); saveList(naming.trim() || 'My list'); setNaming(null); setNote('List saved. Find it under Saved lists.') }}>
              <input value={naming} onChange={e => setNaming(e.target.value)} placeholder="Name: Weekly shop, Meal prep…" autoFocus />
              <button className="btn">Save</button>
            </form>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost grow" onClick={() => setNaming('')}><Icon name="bookmark" />Save list for later</button>
              {done.length > 0 && <button className="btn ghost grow" onClick={clearGrocery}>Clear {done.length} checked</button>}
            </div>
          ))}
        </>
      ) : (
        <>
          {lists.map(l => (
            <div key={l.id} className="card">
              <div className="card-h">
                <div><h3>{l.name}</h3><div className="small mu">{l.items.length} items · saved {fmtDate(l.at)}</div></div>
                <button className="x" onClick={() => deleteList(l.id)} aria-label="Delete list" style={{ color: 'var(--mu)' }}><Icon name="trash" size={18} /></button>
              </div>
              <div className="small mu" style={{ marginBottom: 12 }}>{l.items.slice(0, 8).join(', ')}{l.items.length > 8 && ` and ${l.items.length - 8} more`}</div>
              <button className="btn sm" onClick={() => { loadList(l.id); setTab('list'); setNote(`Added ${l.name} to your list`) }}><Icon name="plus" />Add to my list</button>
            </div>
          ))}
          {!lists.length && <div className="empty">Save a list you buy often, like a weekly shop, and add it back in one tap.</div>}
        </>
      )}
    </>
  )
}
