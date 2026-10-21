import { shiftDay, todayKey } from '../store.js'

// Days with a workout or any food logged.
export function activeDays(workouts, diary) {
  const days = new Set(Object.keys(diary).filter(d => diary[d]?.length))
  for (const w of workouts) days.add(todayKey(new Date(w.start)))
  return days
}

// Days in a row up to today. Today not logged yet doesn't break it: the count starts at yesterday.
export function dayStreak(days) {
  let d = todayKey()
  if (!days.has(d)) d = shiftDay(d, -1)
  let n = 0
  while (days.has(d)) { n++; d = shiftDay(d, -1) }
  return n
}

export function longestStreak(days) {
  let best = 0, run = 0, prev = null
  for (const d of [...days].sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

export const mondayOf = date => shiftDay(date, -((new Date(date + 'T12:00').getDay() + 6) % 7))

// Weeks in a row with at least `goal` workouts. The current week counts once it is met.
export function weekStreak(workouts, goal) {
  const per = {}
  for (const w of workouts) { const m = mondayOf(todayKey(new Date(w.start))); per[m] = (per[m] || 0) + 1 }
  let m = mondayOf(todayKey())
  if ((per[m] || 0) < goal) m = shiftDay(m, -7)
  let n = 0
  while ((per[m] || 0) >= goal) { n++; m = shiftDay(m, -7) }
  return n
}

// Body weights in date order: [{ date, kg }]
export const weights = body => Object.keys(body).sort().filter(d => body[d].weight).map(d => ({ date: d, kg: body[d].weight }))
