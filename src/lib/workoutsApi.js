import { kgToPounds, poundsToKg, templateByKey } from "../data/workouts.js";
import { supabase } from "./supabaseClient.js";

const SESSION_SELECT = `
  id, template_key, name, started_at, completed_at, notes,
  session_exercises (
    id, session_id, exercise_key, exercise_name, position,
    target_sets, target_rep_min, target_rep_max, rest_seconds,
    workout_sets (id, session_exercise_id, set_number, reps, weight_kg, completed_at, notes)
  )
`;

const isoWeekStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString();
};

function mapExercise(row) {
  return {
    id: row.id,
    key: row.exercise_key,
    name: row.exercise_name,
    position: row.position,
    targetSets: row.target_sets,
    repMin: row.target_rep_min,
    repMax: row.target_rep_max,
    restSeconds: row.rest_seconds,
    sets: [...(row.workout_sets || [])]
      .sort((a, b) => a.set_number - b.set_number)
      .map((set) => ({
        id: set.id,
        number: set.set_number,
        weight: kgToPounds(set.weight_kg),
        reps: set.reps == null ? "" : String(set.reps),
        done: Boolean(set.completed_at),
        completedAt: set.completed_at,
      })),
  };
}

export async function loadWorkoutData() {
  const [sessionResult, goalResult, measurementResult] = await Promise.all([
    supabase.from("workout_sessions").select(SESSION_SELECT).order("started_at", { ascending: false }),
    supabase.from("goals").select("id, goal_type, name, exercise_key, baseline_value, target_value, target_date, created_at, archived_at").is("archived_at", null).order("created_at"),
    supabase.from("body_measurements").select("id, measured_at, weight_kg, notes").order("measured_at", { ascending: false }).limit(90),
  ]);
  const failed = [sessionResult, goalResult, measurementResult].find((result) => result.error);
  if (failed) throw failed.error;

  const sessions = sessionResult.data || [];
  const activeRow = sessions.find((session) => !session.completed_at) || null;
  const completed = sessions.filter((session) => session.completed_at);
  const measurements = measurementResult.data || [];
  const currentWeekCount = completed.filter((session) => session.completed_at >= isoWeekStart()).length;

  const allSets = sessions.flatMap((session) => (session.session_exercises || []).flatMap((exercise) =>
    (exercise.workout_sets || []).filter((set) => set.completed_at).map((set) => ({ ...set, exercise_key: exercise.exercise_key, session_date: session.completed_at })),
  ));
  const goals = (goalResult.data || []).map((goal) => {
    let current = Number(goal.baseline_value);
    if (goal.goal_type === "body_weight" && measurements[0]) current = Number(kgToPounds(measurements[0].weight_kg));
    if (goal.goal_type === "weekly_workouts") current = currentWeekCount;
    if (goal.goal_type === "estimated_1rm") {
      const best = allSets.filter((set) => set.exercise_key === goal.exercise_key).reduce((max, set) => {
        const reps = Number(set.reps || 0);
        const kg = Number(set.weight_kg || 0);
        return Math.max(max, (kg * (1 + reps / 30)) * 2.2046226218);
      }, 0);
      if (best) current = Math.round(best);
    }
    const isWeight = goal.goal_type === "body_weight" || goal.goal_type === "estimated_1rm";
    return {
      id: goal.id,
      type: goal.goal_type,
      name: goal.name,
      exerciseKey: goal.exercise_key,
      start: isWeight ? Number(kgToPounds(goal.baseline_value)) : Number(goal.baseline_value),
      current,
      target: isWeight ? Number(kgToPounds(goal.target_value)) : Number(goal.target_value),
      unit: goal.goal_type === "weekly_workouts" ? "workouts" : "lb",
      due: goal.target_date ? new Date(`${goal.target_date}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }) : goal.goal_type === "weekly_workouts" ? "Weekly" : "No date",
    };
  });

  const history = completed.map((session) => {
    const best = (session.session_exercises || []).flatMap((exercise) => exercise.workout_sets || [])
      .filter((set) => set.completed_at && set.weight_kg != null && set.reps != null)
      .sort((a, b) => Number(b.weight_kg) - Number(a.weight_kg))[0];
    return {
      id: session.id,
      date: new Date(session.completed_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
      name: session.name,
      lift: best ? `${kgToPounds(best.weight_kg)} × ${best.reps}` : "Workout complete",
    };
  });

  return {
    sessions: history,
    goals,
    bodyMeasurements: measurements,
    workoutsThisWeek: currentWeekCount,
    completedDays: [...new Set(completed.filter((session) => session.completed_at >= isoWeekStart()).map((session) => {
      const weekday = new Date(session.completed_at).getDay();
      return ({ 1: "M", 2: "T", 4: "Th", 5: "F" })[weekday];
    }).filter(Boolean))],
    activeSession: activeRow ? {
      id: activeRow.id,
      templateKey: activeRow.template_key,
      name: activeRow.name,
      startedAt: activeRow.started_at,
      restUntil: null,
      exercises: [...(activeRow.session_exercises || [])].sort((a, b) => a.position - b.position).map(mapExercise),
    } : null,
  };
}

export async function startWorkout(templateKey) {
  const template = templateByKey[templateKey];
  if (!template) throw new Error("That workout template could not be found.");
  const { data: session, error: sessionError } = await supabase.from("workout_sessions")
    .insert({ template_key: template.key, name: template.name })
    .select("id, started_at").single();
  if (sessionError) throw sessionError;

  const { data: exercises, error: exerciseError } = await supabase.from("session_exercises").insert(template.exercises.map((exercise, position) => ({
    session_id: session.id,
    exercise_key: exercise.key,
    exercise_name: exercise.name,
    position,
    target_sets: exercise.sets,
    target_rep_min: exercise.repMin,
    target_rep_max: exercise.repMax,
    rest_seconds: exercise.rest,
  }))).select("id, exercise_key, exercise_name, position, target_sets, target_rep_min, target_rep_max, rest_seconds");
  if (exerciseError) {
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    throw exerciseError;
  }

  const plannedSets = exercises.flatMap((exercise) => Array.from({ length: exercise.target_sets }, (_, index) => ({
    session_exercise_id: exercise.id,
    set_number: index + 1,
  })));
  const { error: setsError } = await supabase.from("workout_sets").insert(plannedSets);
  if (setsError) {
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    throw setsError;
  }
  return session.id;
}

export async function saveSet(exerciseId, set) {
  const { error } = await supabase.from("workout_sets").upsert({
    session_exercise_id: exerciseId,
    set_number: set.number,
    reps: set.reps === "" ? null : Number(set.reps),
    weight_kg: poundsToKg(set.weight),
    completed_at: set.done ? (set.completedAt || new Date().toISOString()) : null,
  }, { onConflict: "session_exercise_id,set_number" });
  if (error) throw error;
}

export async function finishWorkout(sessionId) {
  const { error } = await supabase.from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function addWorkoutSet(exerciseId, sets) {
  const nextNumber = Math.max(0, ...sets.map((set) => set.number)) + 1;
  const { data, error } = await supabase.from("workout_sets").insert({ session_exercise_id: exerciseId, set_number: nextNumber })
    .select("id, set_number, reps, weight_kg, completed_at").single();
  if (error) throw error;
  return { id: data.id, number: data.set_number, reps: "", weight: "", done: false };
}

export async function createGoal(values) {
  const physical = values.type !== "weekly_workouts";
  const { error } = await supabase.from("goals").insert({
    goal_type: values.type,
    name: values.name,
    exercise_key: values.type === "estimated_1rm" ? values.exerciseKey : null,
    baseline_value: physical ? poundsToKg(values.start) : Number(values.start),
    target_value: physical ? poundsToKg(values.target) : Number(values.target),
    target_date: values.due || null,
  });
  if (error) throw error;
}

export async function recordBodyWeight(pounds) {
  const { error } = await supabase.from("body_measurements").insert({ weight_kg: poundsToKg(pounds) });
  if (error) throw error;
}
