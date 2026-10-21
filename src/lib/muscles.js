// The 18 muscles the body map can shade (openGym's set, from MuscleMap regions), head to toe.

export const MUSCLES = [
  'trapezius', 'deltoids', 'chest', 'upper-back', 'serratus',
  'biceps', 'triceps', 'forearm',
  'abs', 'obliques', 'lower-back',
  'gluteal', 'quadriceps', 'hamstring', 'adductors', 'hip-flexors',
  'calves', 'tibialis',
]

export const MUSCLE_NAME = {
  trapezius: 'Traps', deltoids: 'Shoulders', chest: 'Chest', 'upper-back': 'Upper back',
  serratus: 'Serratus', biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', 'lower-back': 'Lower back', gluteal: 'Glutes',
  quadriceps: 'Quads', hamstring: 'Hamstrings', adductors: 'Adductors',
  'hip-flexors': 'Hip flexors', calves: 'Calves', tibialis: 'Shins',
}

// A secondary muscle counts this much of a set against a primary one.
export const SECONDARY = 0.4

// Weighted sets per muscle across a list of logged exercises ({ exId, sets }).
export function muscleLoad(entries, exById) {
  const load = {}
  for (const { exId, sets } of entries) {
    const e = exById(exId)
    if (!e) continue
    const n = sets.filter(s => s.done).length
    if (!n) continue
    for (const m of e.p) load[m] = (load[m] || 0) + n
    for (const m of e.s) load[m] = (load[m] || 0) + n * SECONDARY
  }
  return load
}
