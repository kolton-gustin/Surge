export const workoutTemplates = [
  {
    key: "upper_a",
    name: "Press",
    description: "Bench and overhead pressing",
    exercises: [
      { key: "bench_press", name: "Barbell bench press", sets: 3, repMin: 6, repMax: 8, rest: 120 },
      { key: "barbell_row", name: "Barbell row", sets: 3, repMin: 8, repMax: 10, rest: 90 },
      { key: "overhead_press", name: "Overhead press", sets: 3, repMin: 6, repMax: 8, rest: 120 },
      { key: "lat_pulldown", name: "Lat pulldown", sets: 3, repMin: 8, repMax: 12, rest: 75 },
      { key: "lateral_raise", name: "Dumbbell lateral raise", sets: 3, repMin: 12, repMax: 15, rest: 60 },
    ],
  },
  {
    key: "lower_a",
    name: "Squat",
    description: "Squats and lower body strength",
    exercises: [
      { key: "back_squat", name: "Back squat", sets: 3, repMin: 5, repMax: 7, rest: 150 },
      { key: "romanian_deadlift", name: "Romanian deadlift", sets: 3, repMin: 8, repMax: 10, rest: 120 },
      { key: "leg_press", name: "Leg press", sets: 3, repMin: 10, repMax: 12, rest: 90 },
      { key: "leg_curl", name: "Seated leg curl", sets: 3, repMin: 10, repMax: 12, rest: 75 },
      { key: "calf_raise", name: "Standing calf raise", sets: 3, repMin: 12, repMax: 15, rest: 60 },
    ],
  },
  {
    key: "upper_b",
    name: "Pull",
    description: "Rows, pulldowns, and shoulders",
    exercises: [
      { key: "incline_db_press", name: "Incline dumbbell press", sets: 3, repMin: 8, repMax: 10, rest: 90 },
      { key: "lat_pulldown", name: "Lat pulldown", sets: 3, repMin: 8, repMax: 10, rest: 90 },
      { key: "seated_cable_row", name: "Seated cable row", sets: 3, repMin: 8, repMax: 12, rest: 75 },
      { key: "db_shoulder_press", name: "Dumbbell shoulder press", sets: 3, repMin: 8, repMax: 10, rest: 75 },
      { key: "face_pull", name: "Face pull", sets: 3, repMin: 12, repMax: 15, rest: 60 },
    ],
  },
  {
    key: "lower_b",
    name: "Deadlift",
    description: "Heavy hinges and leg work",
    exercises: [
      { key: "deadlift", name: "Deadlift", sets: 3, repMin: 4, repMax: 6, rest: 180 },
      { key: "front_squat", name: "Front squat", sets: 3, repMin: 6, repMax: 8, rest: 120 },
      { key: "hip_thrust", name: "Barbell hip thrust", sets: 3, repMin: 8, repMax: 12, rest: 90 },
      { key: "leg_extension", name: "Leg extension", sets: 3, repMin: 10, repMax: 15, rest: 60 },
      { key: "calf_raise", name: "Seated calf raise", sets: 3, repMin: 12, repMax: 15, rest: 60 },
    ],
  },
];

export const templateByKey = Object.fromEntries(workoutTemplates.map((template) => [template.key, template]));
export const poundsToKg = (pounds) => pounds === "" || pounds == null ? null : Math.round(Number(pounds) / 2.2046226218 * 100) / 100;
export const kgToPounds = (kilograms) => kilograms == null ? "" : String(Math.round(Number(kilograms) * 2.2046226218 * 10) / 10);
