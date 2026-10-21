// Built-in programs: a rotation of days, each a list of catalog exercise ids.
// The user picks one in Train; Today and the desktop sidebar offer its next day.
//   { id, name, blurb, level, perWeek, days: [{ name, exIds, sets?, reps? }] }

export const PROGRAMS = [
  { id: 'ppl', name: 'Push / Pull / Legs', blurb: 'The classic six-day split, run twice a week or once through.', level: 'Intermediate', perWeek: 6, days: [
    { name: 'Push A', exIds: ['0025', '0314', '0091', '0334', '0241', '2188'] },
    { name: 'Pull A', exIds: ['0032', '0652', '0027', '11060', '0031', '0313'] },
    { name: 'Legs A', exIds: ['0043', '0085', '0739', '0586', '0585', '0605'] },
    { name: 'Push B', exIds: ['0047', '0289', '0405', '0178', '0251', '0194'] },
    { name: 'Pull B', exIds: ['2330', '0292', '0861', '2487', '0318', '0868'] },
    { name: 'Legs B', exIds: ['0042', '1460', '0743', '0599', '1060', '0594'] },
  ] },
  { id: 'ul', name: 'Upper / Lower', blurb: 'Four days, each muscle twice a week. Good balance of strength and size.', level: 'Beginner+', perWeek: 4, days: [
    { name: 'Upper A', exIds: ['0025', '0027', '0091', '2330', '0031', '0241'] },
    { name: 'Lower A', exIds: ['0043', '0085', '0739', '0586', '0605', '0463'] },
    { name: 'Upper B', exIds: ['0314', '0292', '0405', '0652', '0313', '2188'] },
    { name: 'Lower B', exIds: ['0032', '0042', '2290', '0585', '0594', '0472'] },
  ] },
  { id: 'fb3', name: 'Full body ×3', blurb: 'Three full-body days a week. The best start for most people.', level: 'Beginner', perWeek: 3, days: [
    { name: 'Full body A', exIds: ['0043', '0025', '0027', '0091', '0463'] },
    { name: 'Full body B', exIds: ['0032', '0314', '2330', '0334', '0472'] },
    { name: 'Full body C', exIds: ['0739', '0289', '0861', '0085', '0274'] },
  ] },
  { id: '5x5', name: 'Strength 5×5', blurb: 'Two alternating days of heavy compounds, five sets of five. Add weight every session.', level: 'Beginner', perWeek: 3, days: [
    { name: '5×5 A', exIds: ['0043', '0025', '0027'], sets: 5, reps: 5 },
    { name: '5×5 B', exIds: ['0043', '0091', '0032'], sets: 5, reps: 5 },
  ] },
  { id: 'bro', name: 'Body-part split', blurb: 'One muscle group a day, five days. Lots of volume per muscle.', level: 'Intermediate', perWeek: 5, days: [
    { name: 'Chest', exIds: ['0025', '0314', '0308', '0251', '1030'] },
    { name: 'Back', exIds: ['0032', '0652', '0027', '0861', '0406'] },
    { name: 'Shoulders', exIds: ['0091', '0334', '2137', '2487', '0041'] },
    { name: 'Legs', exIds: ['0043', '0739', '0085', '0585', '0586', '0605'] },
    { name: 'Arms', exIds: ['0031', '0241', '0313', '0061', '0070', '0194'] },
  ] },
  { id: 'rotation', name: 'Rotation A / B / C', blurb: 'Three rotating sessions you repeat in order, whatever the weekday.', level: 'All levels', perWeek: 3, days: [
    { name: 'Rotation A', exIds: ['0043', '0025', '0292', '0336', '0175'] },
    { name: 'Rotation B', exIds: ['0085', '0405', '2330', '1060', '0472'] },
    { name: 'Rotation C', exIds: ['0739', '0047', '0861', '0334', '0313', '0241'] },
  ] },
  { id: 'home', name: 'Home bodyweight', blurb: 'No equipment. Push-ups, squats, lunges and core.', level: 'Beginner', perWeek: 3, days: [
    { name: 'Home A', exIds: ['0662', '0612', '0499', '0129', '0463', '0630'] },
    { name: 'Home B', exIds: ['0283', '0514', '1409', '1326', '0715', '0276'] },
    { name: 'Home C', exIds: ['1160', '0662', '0431', '3013', '0459', '1241'] },
  ] },
  { id: 'db', name: 'Dumbbells only', blurb: 'A pair of dumbbells and a bench. Full body in three days.', level: 'Beginner+', perWeek: 3, days: [
    { name: 'Dumbbell A', exIds: ['0289', '0292', '0413', '0405', '0294', '0463'] },
    { name: 'Dumbbell B', exIds: ['0314', '1459', '0336', '0334', '0313', '2188'] },
    { name: 'Dumbbell C', exIds: ['1760', '0308', '2290', '2487', '0297', '0417'] },
  ] },
  { id: 'glutes', name: 'Glutes & legs', blurb: 'Lower-body focus with hip thrusts, RDLs and abduction work.', level: 'All levels', perWeek: 3, days: [
    { name: 'Glutes A', exIds: ['1060', '0085', '2290', '2755', '3181'] },
    { name: 'Glutes B', exIds: ['0117', '0739', '0431', '6607', '1409'] },
    { name: 'Glutes C', exIds: ['0043', '1757', '1460', '0586', '2755'] },
  ] },
  { id: 'kb', name: 'Kettlebell', blurb: 'One kettlebell, swings and presses. Short and hard.', level: 'All levels', perWeek: 3, days: [
    { name: 'Kettlebell A', exIds: ['0549', '0534', '0553', '3322', '0687'] },
    { name: 'Kettlebell B', exIds: ['0549', '0336', '0553', '0292', '0463'] },
  ] },
  { id: 'cond', name: 'Conditioning', blurb: 'Cardio and circuits for heart and lungs. Pair with any lifting plan.', level: 'All levels', perWeek: 3, days: [
    { name: 'Intervals', exIds: ['2138', '1160', '0630', '0514', '3094'] },
    { name: 'Engine', exIds: ['1161', '2612', '0128', '0549', '2141'] },
    { name: 'Steady', exIds: ['0685', '2141', '2138'] },
  ] },
  { id: 'mobility', name: 'Mobility', blurb: 'Fifteen minutes of stretching for hips, back and hamstrings.', level: 'All levels', perWeek: 7, days: [
    { name: 'Mobility', exIds: ['1604', '4580', '1053', '1511', '1943', '0945', '1471'] },
  ] },
]

export const programById = id => PROGRAMS.find(p => p.id === id) || PROGRAMS[0]

// The day after the last one done from this program (by name), or the first.
export function nextDay(program, workouts) {
  const names = program.days.map(d => d.name)
  const last = workouts.find(w => names.includes(w.name))
  return program.days[last ? (names.indexOf(last.name) + 1) % names.length : 0]
}

// Every program day as a startable routine, for the routine list and the global search.
export const allDays = () => PROGRAMS.flatMap(p => p.days.map(d => ({ ...d, program: p.name })))
