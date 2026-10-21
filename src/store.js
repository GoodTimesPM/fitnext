import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Everything the user owns, kept on the device (localStorage) until accounts and sync exist.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const todayKey = (d = new Date()) => d.toLocaleDateString('en-CA')

// The app was called Tally; carry an old save over to the new key once.
try { if (!localStorage.fitnext && localStorage.tally) localStorage.fitnext = localStorage.tally } catch {}

const blankSet = (prev, reps = '') => ({ w: prev?.w ?? '', r: prev?.r ?? reps, done: false })

export const useStore = create(persist((set, get) => ({
  settings: { theme: 'glacier', unit: 'lb', name: '', figure: 'male', restSec: 90, program: 'ppl', exView: 'list', routineView: 'grid', custom: null, savedThemes: [] },
  goals: { kcal: 2400, p: 180, c: 260, f: 75, water: 8, weight: null, workouts: 4 },
  workouts: [],       // finished: { id, name, start, end, exercises: [{ exId, sets: [{ w, r, done }] }] }
  active: null,       // the workout in progress, same shape
  routines: [],       // { id, name, exIds }
  diary: {},          // date -> [{ id, meal, food, qty }]   food: normalized (lib/food.js)
  water: {},          // date -> glasses
  savedFoods: [],     // normalized foods
  grocery: [],        // { id, text, done }
  lists: [],          // saved grocery lists: { id, name, items: [text], at }
  recipes: [],        // { id, title, image, servings, mins, ingredients: [text], steps: [text], kcal, p, c, f, source, url }
  body: {},           // date -> { weight (kg), waist, chest, hips, arm, thigh, neck (cm), bf (%) }
  gone: {},           // id -> when it was deleted, so sync can drop it on the other devices too

  setSetting: (k, v) => set(s => ({ settings: { ...s.settings, [k]: v } })),
  setGoal: (k, v) => set(s => ({ goals: { ...s.goals, [k]: v } })),

  // ---- workouts ----
  // plan: { sets, reps } from a program day, used when an exercise has no history yet.
  startWorkout: (name = 'Workout', exIds = [], plan) => set(s => ({
    active: { id: uid(), name, start: Date.now(), exercises: exIds.map(exId => ({ exId, sets: setsFromLast(s.workouts, exId, plan) })) },
  })),
  addToWorkout: exId => set(s => {
    const active = s.active || { id: uid(), name: 'Workout', start: Date.now(), exercises: [] }
    return { active: { ...active, exercises: [...active.exercises, { exId, sets: setsFromLast(s.workouts, exId) }] } }
  }),
  updateActive: fn => set(s => ({ active: fn(structuredClone(s.active)) })),
  finishWorkout: () => {
    const a = get().active
    if (!a) return null
    const exercises = a.exercises.map(x => ({ ...x, sets: x.sets.filter(s => s.done) })).filter(x => x.sets.length)
    const w = { ...a, end: Date.now(), exercises }
    set(s => ({ active: null, workouts: exercises.length ? [w, ...s.workouts] : s.workouts }))
    return exercises.length ? w.id : null
  },
  discardWorkout: () => set({ active: null }),
  deleteWorkout: id => set(s => ({ workouts: s.workouts.filter(w => w.id !== id), gone: bury(s, id) })),
  saveRoutine: (name, exIds) => set(s => ({ routines: [...s.routines, { id: uid(), name, exIds }] })),
  deleteRoutine: id => set(s => ({ routines: s.routines.filter(r => r.id !== id), gone: bury(s, id) })),

  // ---- food ----
  // qty is grams (servings for a perServing food); unit is how the user entered it: { label, g, amt }.
  logFood: (date, meal, food, qty, unit) => set(s => ({
    diary: { ...s.diary, [date]: [...(s.diary[date] || []), { id: uid(), meal, food, qty, unit }] },
  })),
  updateFood: (date, id, patch) => set(s => ({ diary: { ...s.diary, [date]: (s.diary[date] || []).map(x => (x.id === id ? { ...x, ...patch } : x)) } })),
  removeFood: (date, id) => set(s => ({ diary: { ...s.diary, [date]: (s.diary[date] || []).filter(x => x.id !== id) }, gone: bury(s, id) })),
  copyMeal: (from, to, meal) => set(s => ({
    diary: { ...s.diary, [to]: [...(s.diary[to] || []), ...(s.diary[from] || []).filter(x => x.meal === meal).map(x => ({ ...x, id: uid() }))] },
  })),
  toggleSaved: food => set(s => (s.savedFoods.some(f => f.key === food.key)
    ? { savedFoods: s.savedFoods.filter(f => f.key !== food.key), gone: bury(s, food.key) }
    : { savedFoods: [food, ...s.savedFoods], gone: unbury(s, food.key) })),
  setWater: (date, n) => set(s => ({ water: { ...s.water, [date]: Math.max(0, n) } })),
  addGrocery: texts => set(s => ({ grocery: [...s.grocery, ...texts.filter(t => !s.grocery.some(g => g.text === t && !g.done)).map(text => ({ id: uid(), text, done: false }))] })),
  toggleGrocery: id => set(s => ({ grocery: s.grocery.map(g => (g.id === id ? { ...g, done: !g.done } : g)) })),
  removeGrocery: id => set(s => ({ grocery: s.grocery.filter(g => g.id !== id), gone: bury(s, id) })),
  clearGrocery: () => set(s => ({ grocery: s.grocery.filter(g => !g.done), gone: bury(s, ...s.grocery.filter(g => g.done).map(g => g.id)) })),
  saveList: name => set(s => ({ lists: [{ id: uid(), name, items: s.grocery.map(g => g.text), at: Date.now() }, ...s.lists] })),
  loadList: id => get().addGrocery(get().lists.find(l => l.id === id)?.items || []),
  deleteList: id => set(s => ({ lists: s.lists.filter(l => l.id !== id), gone: bury(s, id) })),

  // ---- recipes ----
  saveRecipes: list => set(s => {
    const have = new Set(s.recipes.map(r => r.source))
    const fresh = list.filter(r => !r.source || !have.has(r.source)).map(r => ({ ...r, id: r.id || uid() }))
    return { recipes: [...fresh, ...s.recipes] }
  }),
  updateRecipe: (id, patch) => set(s => ({ recipes: s.recipes.map(r => (r.id === id ? { ...r, ...patch } : r)) })),
  deleteRecipe: id => set(s => ({ recipes: s.recipes.filter(r => r.id !== id), gone: bury(s, id) })),

  // ---- body ----
  setBody: (date, key, value) => set(s => {
    const day = { ...s.body[date] }
    if (value === '' || value == null || Number.isNaN(value)) delete day[key]; else day[key] = value
    const body = { ...s.body, [date]: day }
    if (!Object.keys(day).length) delete body[date]
    return { body }
  }),
}), {
  name: 'fitnext',
  // 1: pounds became the default weight unit; saves from before switch over once.
  version: 1,
  migrate: (saved, from) => (from < 1 && saved?.settings ? { ...saved, settings: { ...saved.settings, unit: 'lb' } } : saved),
  // New settings and goals reach existing saves (persist's default merge is shallow).
  merge: (saved, fresh) => ({ ...fresh, ...saved, settings: { ...fresh.settings, ...saved?.settings }, goals: { ...fresh.goals, ...saved?.goals } }),
}))

const bury = (s, ...ids) => ({ ...s.gone, ...Object.fromEntries(ids.map(id => [id, Date.now()])) })
// Saving a food again after unsaving it: it must not stay deleted on the other devices.
const unbury = (s, id) => { const gone = { ...s.gone }; delete gone[id]; return gone }

// The day the food diary shows. Shared by every panel on the desktop layout; dir drives the slide.
export const useDay = create(set => ({
  date: todayKey(), dir: 0,
  setDate: date => set(s => ({ date, dir: date > s.date ? 1 : date < s.date ? -1 : 0 })),
}))
export const shiftDay = (date, n) => { const x = new Date(date + 'T12:00'); x.setDate(x.getDate() + n); return todayKey(x) }

// Body numbers are stored metric and shown in the user's units.
export const LB = 2.20462, IN = 2.54
export const toKg = (v, unit) => (unit === 'lb' ? v / LB : v)
export const fromKg = (v, unit) => (unit === 'lb' ? v * LB : v)
export const lenUnit = unit => (unit === 'lb' ? 'in' : 'cm')
export const toCm = (v, unit) => (unit === 'lb' ? v * IN : v)
export const fromCm = (v, unit) => (unit === 'lb' ? v / IN : v)

// The sets done for an exercise the last time it was trained, to prefill the next session.
export function lastSetsFor(workouts, exId) {
  for (const w of workouts) {
    const x = w.exercises.find(e => e.exId === exId)
    if (x) return x.sets
  }
  return null
}

// New sets for an exercise: last session's weights and reps, unchecked; the first time, the plan's
// sets and reps (three empty sets without one).
const setsFromLast = (workouts, exId, plan) => lastSetsFor(workouts, exId)?.map(x => blankSet(x))
  || Array.from({ length: plan?.sets || 3 }, () => blankSet(null, plan?.reps || ''))
