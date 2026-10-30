const KG_TO_LB = 2.2046226218;

export function buildStrengthHistory(completedSessions) {
  return completedSessions.flatMap((session) =>
    [...(session.session_exercises || [])].sort((a, b) => a.position - b.position).flatMap((exercise) => {
      const loggedSets = (exercise.workout_sets || [])
        .filter((set) => set.completed_at && Number(set.weight_kg) > 0 && Number(set.reps) > 0)
        .map((set) => ({
          weightKg: Number(set.weight_kg),
          weightLb: Math.round(Number(set.weight_kg) * KG_TO_LB * 10) / 10,
          reps: Number(set.reps),
        }));
      if (!loggedSets.length) return [];

      const bestSet = loggedSets.reduce((best, set) =>
        set.weightKg > best.weightKg || (set.weightKg === best.weightKg && set.reps > best.reps) ? set : best);
      return [{
        id: exercise.id,
        exerciseKey: exercise.exercise_key,
        exerciseName: exercise.exercise_name,
        completedAt: session.completed_at,
        weightKg: bestSet.weightKg,
        weightLb: bestSet.weightLb,
        reps: bestSet.reps,
      }];
    }),
  ).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}
