// Personal records, worked out from history rather than stored, so editing or deleting a
// workout can never leave a stale record behind.

// Estimated one-rep max (Epley). Bodyweight sets with no load count by reps alone.
export const e1rm = (w, r) => (w > 0 && r > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0)

// Walks history oldest first. Returns:
//   best:  exId -> { weight, reps, e1rm, volume, at }   the standing records
//   marks: workoutId -> exId -> setIndex -> ['weight' | 'e1rm' | 'reps' | 'volume']   which sets set a record
export function computePRs(workouts) {
  const best = {}
  const marks = {}
  const chronological = [...workouts].sort((a, b) => a.start - b.start)
  for (const w of chronological) {
    for (const x of w.exercises) {
      const b = best[x.exId] ||= { weight: 0, reps: 0, e1rm: 0, volume: 0, at: {} }
      const first = !b.seen
      b.seen = true
      x.sets.forEach((s, i) => {
        const wt = +s.w || 0, r = +s.r || 0
        const kinds = []
        if (wt > b.weight) { b.weight = wt; b.at.weight = w.id; kinds.push('weight') }
        const est = e1rm(wt, r)
        if (est > b.e1rm) { b.e1rm = est; b.at.e1rm = w.id; kinds.push('e1rm') }
        if (!wt && r > b.reps) { b.reps = r; b.at.reps = w.id; kinds.push('reps') }
        const vol = wt * r
        if (vol > b.volume) { b.volume = vol; b.at.volume = w.id; kinds.push('volume') }
        // The first time an exercise is ever logged sets a baseline, not a record.
        if (kinds.length && !first) ((marks[w.id] ||= {})[x.exId] ||= {})[i] = kinds
      })
    }
  }
  return { best, marks }
}

export const workoutVolume = w => w.exercises.reduce((sum, x) => sum + x.sets.reduce((s, set) => s + (+set.w || 0) * (+set.r || 0), 0), 0)
export const prCount = (marks, wid) => Object.values(marks[wid] || {}).reduce((n, sets) => n + Object.keys(sets).length, 0)
