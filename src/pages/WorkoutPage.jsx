import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import "./WorkoutPage.css";

function WorkoutPage({ state, setState, onFinish, onSaveSet, onAddSet, onRemoveSet, busy }) {
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const session = state.activeSession;
  const exerciseIndex = state.activeExerciseIndex || 0;
  const exercise = session?.exercises?.[exerciseIndex];
  if (!session || !exercise) return <section className="page"><p className="subtle">No active workout. Start one from Today.</p></section>;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
  const rest = session.restUntil ? Math.max(0, Math.ceil((session.restUntil - Date.now()) / 1000)) : 0;
  const updateSet = (index, field, value) => setState((current) => ({
    ...current,
    activeSession: { ...current.activeSession, exercises: current.activeSession.exercises.map((item, exerciseIndex) => exerciseIndex === (current.activeExerciseIndex || 0) ? { ...item, sets: item.sets.map((set, setIndex) => setIndex === index ? { ...set, [field]: value } : set) } : item) },
  }));
  const toggleSet = (index) => {
    const currentSet = exercise.sets[index];
    const done = !currentSet.done;
    const previousWeight = [...exercise.sets.slice(0, index)].reverse().find((set) => set.weight)?.weight || "";
    const updated = {
      ...currentSet,
      weight: done ? currentSet.weight || previousWeight : currentSet.weight,
      reps: done ? currentSet.reps || String(exercise.repMin || "") : currentSet.reps,
      done,
      completedAt: done ? new Date().toISOString() : null,
    };
    const restUntil = done ? Date.now() + (exercise.restSeconds || 90) * 1000 : null;
    setState((current) => ({
      ...current,
      activeSession: {
        ...current.activeSession,
        restUntil,
        exercises: current.activeSession.exercises.map((item) => item.id === exercise.id
          ? { ...item, sets: item.sets.map((set, setIndex) => setIndex === index ? updated : set) }
          : item),
      },
    }));
    onSaveSet(exercise, updated);
  };
  const nextExercise = session.exercises[exerciseIndex + 1];
  const allSetsComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.done);
  const canAdvance = allSetsComplete && !busy;
  const lastAddedSet = exercise.sets.filter((set) => set.number > exercise.targetSets).at(-1);
  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter((item) => item.sets.length > 0 && item.sets.every((set) => set.done)).length;
  const workoutComplete = totalExercises > 0 && completedExercises === totalExercises;
  const progressPercent = totalExercises ? Math.round((completedExercises / totalExercises) * 100) : 0;
  return (
    <section className="page workout-page">
      <Header eyebrow="Workout in progress" title={session.name} />

      <div className="workout-summary">
        <div className="workout-summary-row">
          <div className="workout-metric">
            <span>Elapsed</span>
            <strong>{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</strong>
          </div>
          <div className="workout-metric workout-metric-right">
            <span>Exercises completed</span>
            <strong>{completedExercises}<small> / {totalExercises}</small></strong>
          </div>
        </div>
        <div className="workout-progress-track" role="progressbar" aria-label="Workout exercises completed" aria-valuemin={0} aria-valuemax={totalExercises} aria-valuenow={completedExercises}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <article className="card exercise-card">
        <div className="exercise-topline">
          <span className="exercise-step">Exercise {exerciseIndex + 1} of {session.exercises.length}</span>
          <span className="exercise-target">{exercise.targetSets} sets · {exercise.repMin}–{exercise.repMax} reps</span>
        </div>
        <h2 className="exercise-title">{exercise.name}</h2>
        <div className="set-head"><span>SET</span><span>PREV</span><span>LBS</span><span>REPS</span><span>DONE</span></div>
        {exercise.sets.map((set, index) => (
          <div className={`set-row ${set.done ? "complete" : ""}`} key={set.id || index}>
            <span className="set-number">{set.number}</span>
            <span className="previous" aria-label={`Previous weight for set ${index + 1}: ${set.previousWeight ? `${set.previousWeight} pounds` : "none"}`}>{set.previousWeight || "—"}</span>
            <input className="set-input" aria-label={`Set ${index + 1} weight in pounds`} type="number" min="0" inputMode="decimal" value={set.weight} onChange={(event) => updateSet(index, "weight", event.target.value)} onBlur={() => onSaveSet(exercise, exercise.sets[index])} />
            <input className="set-input" aria-label={`Set ${index + 1} reps`} type="number" min="0" inputMode="numeric" value={set.reps} onChange={(event) => updateSet(index, "reps", event.target.value)} onBlur={() => onSaveSet(exercise, exercise.sets[index])} />
            <button type="button" className="check-set" aria-label={`Mark set ${index + 1} ${set.done ? "incomplete" : "complete"}`} aria-pressed={set.done} onClick={() => toggleSet(index)}>✓</button>
          </div>
        ))}
        <div className="set-actions">
          <button type="button" className="add-set" disabled={busy} onClick={() => onAddSet(exercise)}>+ Add set</button>
          {lastAddedSet && <button type="button" className="remove-added-set" disabled={busy} title={`Remove extra set ${lastAddedSet.number}`} onClick={() => onRemoveSet(exercise, lastAddedSet)}>Remove last set</button>}
        </div>
      </article>

      <div className={`rest-card ${rest > 0 ? "running" : ""}`}>
        <div className="rest-details">
          <span className="rest-label">Rest timer</span>
          <strong className="rest-time">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</strong>
          <span className="rest-hint">{rest > 0 ? "Recover before your next set" : "Starts when you complete a set"}</span>
        </div>
        {rest > 0 && <button type="button" className="rest-skip" onClick={() => setState((current) => ({ ...current, activeSession: { ...current.activeSession, restUntil: null } }))}>Skip</button>}
      </div>

      {workoutComplete ? (
        <button type="button" className="finish-workout-cta" disabled={busy} onClick={onFinish}>
          <span className="finish-cta-copy">
            <span className="finish-cta-label">All exercises complete</span>
            <strong>Finish workout</strong>
          </span>
          <span className="finish-cta-arrow" aria-hidden="true">→</span>
        </button>
      ) : nextExercise ? (
        <button
          type="button"
          className={`next-exercise-card ${canAdvance ? "ready" : ""}`}
          disabled={!canAdvance}
          onClick={() => setState((current) => ({ ...current, activeExerciseIndex: (current.activeExerciseIndex || 0) + 1 }))}
        >
          <span className="next-card-copy">
            <span className="next-card-label">Next exercise</span>
            <strong className="next-up">{nextExercise.name}</strong>
            <span className="next-card-hint">{allSetsComplete ? (busy ? "Saving set…" : "Continue workout") : "Complete all sets to continue"}</span>
          </span>
          <span className="next-card-arrow" aria-hidden="true">→</span>
        </button>
      ) : (
        <div className="next-exercise-card final">
          <span className="next-card-copy">
            <span className="next-card-label">Final exercise</span>
            <strong className="next-up">Finish when you're ready</strong>
          </span>
        </div>
      )}
    </section>
  );
}

export default WorkoutPage;
