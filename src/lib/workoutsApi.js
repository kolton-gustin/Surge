import { kgToPounds, poundsToKg } from "../data/workouts.js";
import { supabase } from "./supabaseClient.js";
import { buildStrengthHistory } from "./progress.js";

const SESSION_SELECT = `
  id, template_key, name, started_at, completed_at, notes,
  session_exercises (
    id, session_id, exercise_key, exercise_name, position,
    target_sets, target_rep_min, target_rep_max, rest_seconds,
    workout_sets (id, session_exercise_id, set_number, reps, weight_kg, completed_at, notes)
  )
`;

const isoWeekStart = (referenceDate = new Date()) => {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString();
};

function mapExercise(row, previousWeights = {}) {
  return {
    id: row.id,
    key: row.exercise_key,
    name: row.exercise_name,
    position: row.position,
    targetSets: row.target_sets,
    repMin: row.target_rep_min,
    repMax: row.target_rep_max,
    restSeconds: row.rest_seconds,
    previousWeights,
    sets: [...(row.workout_sets || [])]
      .sort((a, b) => a.set_number - b.set_number)
      .map((set) => ({
        id: set.id,
        number: set.set_number,
        weight: kgToPounds(set.weight_kg),
        previousWeight: previousWeights[set.set_number] ?? "",
        reps: set.reps == null ? "" : String(set.reps),
        done: Boolean(set.completed_at),
        completedAt: set.completed_at,
      })),
  };
}

export async function loadWorkoutTemplates() {
  const { data, error } = await supabase.from("workout_templates")
    .select("id, template_key, name, description, position, workout_template_exercises (id, exercise_key, exercise_name, position, target_sets, target_rep_min, target_rep_max, rest_seconds)")
    .order("position");
  if (error) throw error;
  return (data || []).map((template) => ({
    id: template.id,
    key: template.template_key,
    name: template.name,
    description: template.description || "",
    exercises: [...(template.workout_template_exercises || [])].sort((a, b) => a.position - b.position).map((exercise) => ({
      id: exercise.id, key: exercise.exercise_key, name: exercise.exercise_name,
      sets: exercise.target_sets, repMin: exercise.target_rep_min, repMax: exercise.target_rep_max, rest: exercise.rest_seconds,
    })),
  }));
}

export async function loadWorkoutData(workoutTemplates) {
  const [sessionResult, goalResult, measurementResult] = await Promise.all([
    supabase.from("workout_sessions").select(SESSION_SELECT).order("started_at", { ascending: false }),
    supabase.from("goals").select("id, goal_type, name, exercise_key, baseline_value, target_value, target_date, created_at, archived_at").order("created_at"),
    supabase.from("body_measurements").select("id, measured_at, weight_kg, notes").order("measured_at", { ascending: false }).limit(90),
  ]);
  const failed = [sessionResult, goalResult, measurementResult].find((result) => result.error);
  if (failed) throw failed.error;

  const sessions = sessionResult.data || [];
  const activeRow = sessions.find((session) => !session.completed_at) || null;
  const completed = sessions.filter((session) => session.completed_at)
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
  const previousWeightsByExercise = new Map();
  for (const session of [...completed].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))) {
    for (const priorExercise of session.session_exercises || []) {
      if (previousWeightsByExercise.has(priorExercise.exercise_key)) continue;
      const weights = Object.fromEntries((priorExercise.workout_sets || [])
        .filter((set) => set.completed_at && set.weight_kg != null)
        .map((set) => [set.set_number, kgToPounds(set.weight_kg)]));
      if (Object.keys(weights).length) previousWeightsByExercise.set(priorExercise.exercise_key, weights);
    }
  }
  const measurements = measurementResult.data || [];
  const weekStart = Date.parse(isoWeekStart());
  const completedThisWeek = completed.filter((session) => Date.parse(session.completed_at) >= weekStart);
  const currentWeekCount = completedThisWeek.length;
  const completedTemplateKeysThisWeek = [...new Set(completedThisWeek.map((session) => session.template_key))];
  const latestCompleted = completed.reduce((latest, session) =>
    !latest || Date.parse(session.completed_at) > Date.parse(latest.completed_at) ? session : latest, null);
  const lastTemplateIndex = workoutTemplates.findIndex((template) => template.key === latestCompleted?.template_key);
  const nextTemplateKey = workoutTemplates[(lastTemplateIndex + 1) % workoutTemplates.length].key;

  const strengthHistory = buildStrengthHistory(completed);
  const mappedGoals = (goalResult.data || []).map((goal) => {
    const start = Number(goal.baseline_value);
    const target = Number(goal.target_value);
    const cutoff = goal.archived_at ? Date.parse(goal.archived_at) : Infinity;
    let current = start;
    let hasActivity = false;
    if (goal.goal_type === "body_weight") {
      const latest = measurements.find((item) => Number(item.weight_kg) > 0 && Date.parse(item.measured_at) <= cutoff);
      if (latest) {
        current = Number(latest.weight_kg);
        hasActivity = true;
      }
    }
    if (goal.goal_type === "weekly_workouts") {
      const goalWeekStart = goal.archived_at ? Date.parse(isoWeekStart(goal.archived_at)) : weekStart;
      current = completed.filter((session) => {
        const finishedAt = Date.parse(session.completed_at);
        return finishedAt >= goalWeekStart && finishedAt <= cutoff;
      }).length;
      hasActivity = true;
    }
    if (goal.goal_type === "estimated_1rm") {
      const best = strengthHistory.filter((entry) => entry.exerciseKey === goal.exercise_key && Date.parse(entry.completedAt) <= cutoff)
        .reduce((max, entry) => Math.max(max, entry.weightKg), 0);
      if (best > 0) {
        current = best;
        hasActivity = true;
      }
    }
    const isWeight = goal.goal_type === "body_weight" || goal.goal_type === "estimated_1rm";
    return {
      id: goal.id,
      type: goal.goal_type,
      name: goal.name,
      exerciseKey: goal.exercise_key,
      start: isWeight ? Number(kgToPounds(start)) : start,
      current: isWeight ? Number(kgToPounds(current)) : current,
      target: isWeight ? Number(kgToPounds(target)) : target,
      unit: goal.goal_type === "weekly_workouts" ? "workouts" : "lb",
      targetDate: goal.target_date,
      completedAt: goal.archived_at,
      hasActivity,
    };
  });

  const history = completed.map((session) => {
    const best = (session.session_exercises || []).flatMap((exercise) => exercise.workout_sets || [])
      .filter((set) => set.completed_at && set.weight_kg != null && set.reps != null)
      .sort((a, b) => Number(b.weight_kg) - Number(a.weight_kg))[0];
    return {
      id: session.id,
      date: new Date(session.completed_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
      name: workoutTemplates.find((template) => template.key === session.template_key)?.name || session.name,
      lift: best ? `${kgToPounds(best.weight_kg)} × ${best.reps}` : "Workout complete",
    };
  });

  return {
    sessions: history,
    strengthHistory,
    goals: mappedGoals.filter((goal) => !goal.completedAt),
    completedGoals: mappedGoals.filter((goal) => goal.completedAt),
    bodyMeasurements: measurements,
    workoutsThisWeek: currentWeekCount,
    completedTemplateKeysThisWeek,
    nextTemplateKey,
    activeSession: activeRow ? {
      id: activeRow.id,
      templateKey: activeRow.template_key,
      name: workoutTemplates.find((template) => template.key === activeRow.template_key)?.name || activeRow.name,
      startedAt: activeRow.started_at,
      restUntil: null,
      exercises: [...(activeRow.session_exercises || [])].sort((a, b) => a.position - b.position).map((row) => mapExercise(row, previousWeightsByExercise.get(row.exercise_key))),
    } : null,
  };
}

export async function startWorkout(template) {
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

function templateKey() {
  return `workout_${crypto.randomUUID()}`;
}

export async function saveWorkoutTemplate(values, existingTemplates) {
  const exercises = values.exercises.filter((exercise) => exercise.name.trim());
  if (!values.name.trim()) throw new Error("Give this workout a name.");
  if (!exercises.length) throw new Error("Add at least one exercise.");
  const position = existingTemplates.findIndex((template) => template.id === values.id);
  const row = { template_key: values.key || templateKey(), name: values.name.trim(), description: values.description.trim(), position: position < 0 ? existingTemplates.length : position };
  let templateId = values.id;
  if (templateId) {
    const { error } = await supabase.from("workout_templates").update(row).eq("id", templateId);
    if (error) throw error;
    const { error: deleteError } = await supabase.from("workout_template_exercises").delete().eq("template_id", templateId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase.from("workout_templates").insert(row).select("id").single();
    if (error) throw error;
    templateId = data.id;
  }
  const { error } = await supabase.from("workout_template_exercises").insert(exercises.map((exercise, index) => ({
    template_id: templateId, exercise_key: exercise.key || exercise.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    exercise_name: exercise.name.trim(), position: index, target_sets: Number(exercise.sets), target_rep_min: Number(exercise.repMin), target_rep_max: Number(exercise.repMax), rest_seconds: Number(exercise.rest),
  })));
  if (error) throw error;
  return { id: templateId, key: row.template_key };
}

export async function deleteWorkoutTemplate(templateId, templateCount) {
  if (templateCount <= 1) throw new Error("Keep at least one workout in your library.");
  const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
  if (error) throw error;
}

const pendingSetSaves = new Map();

export function saveSet(exerciseId, set) {
  const key = `${exerciseId}:${set.number}`;
  const previous = pendingSetSaves.get(key) || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const { error } = await supabase.from("workout_sets").upsert({
      session_exercise_id: exerciseId,
      set_number: set.number,
      reps: set.reps === "" ? null : Number(set.reps),
      weight_kg: poundsToKg(set.weight),
      completed_at: set.done ? (set.completedAt || new Date().toISOString()) : null,
    }, { onConflict: "session_exercise_id,set_number" });
    if (error) throw error;
  });
  pendingSetSaves.set(key, pending);
  return pending.finally(() => {
    if (pendingSetSaves.get(key) === pending) pendingSetSaves.delete(key);
  });
}

export async function removeWorkoutSet(exerciseId, set) {
  const pending = pendingSetSaves.get(`${exerciseId}:${set.number}`);
  if (pending) await pending.catch(() => {});
  const { error } = await supabase.from("workout_sets")
    .delete()
    .eq("id", set.id)
    .eq("session_exercise_id", exerciseId);
  if (error) throw error;
}

export async function finishWorkout(sessionId) {
  await Promise.all([...pendingSetSaves.values()]);
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

export async function setGoalCompleted(goalId, completed) {
  const { data, error } = await supabase.from("goals")
    .update({ archived_at: completed ? new Date().toISOString() : null })
    .eq("id", goalId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("That goal could not be updated.");
}

export async function deleteGoal(goalId) {
  const { data, error } = await supabase.from("goals")
    .delete()
    .eq("id", goalId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("That goal could not be deleted.");
}

export async function recordBodyWeight(pounds) {
  const { error } = await supabase.from("body_measurements").insert({ weight_kg: poundsToKg(pounds) });
  if (error) throw error;
}
