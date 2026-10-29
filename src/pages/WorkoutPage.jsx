import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";

function WorkoutPage({ state, setState, onFinish, onSaveSet, onAddSet }) {
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const session = state.activeSession;
  const exercise = session?.exercises?.[state.activeExerciseIndex || 0];
  if (!session || !exercise) return <section className="page"><p className="subtle">No active workout. Start one from Today.</p></section>;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
  const rest = session.restUntil ? Math.max(0, Math.ceil((session.restUntil - Date.now()) / 1000)) : 0;
  const updateSet = (index, field, value) => setState((current) => ({
    ...current,
    activeSession: { ...current.activeSession, exercises: current.activeSession.exercises.map((item, exerciseIndex) => exerciseIndex === (current.activeExerciseIndex || 0) ? { ...item, sets: item.sets.map((set, setIndex) => setIndex === index ? { ...set, [field]: value } : set) } : item) },
  }));
  const toggleSet = (index) => {
    const updated = { ...exercise.sets[index], done: !exercise.sets[index].done, completedAt: exercise.sets[index].done ? null : new Date().toISOString() };
    updateSet(index, "done", updated.done);
    onSaveSet(exercise, updated);
    setState((current) => ({ ...current, activeSession: { ...current.activeSession, restUntil: updated.done ? null : Date.now() + (exercise.restSeconds || 90) * 1000 } }));
  };
  const completeNext = () => {
    const index = exercise.sets.findIndex((set) => !set.done);
    if (index < 0) {
      if ((state.activeExerciseIndex || 0) < session.exercises.length - 1) setState((current) => ({ ...current, activeExerciseIndex: (current.activeExerciseIndex || 0) + 1 }));
      return;
    }
    const prior = [...exercise.sets.slice(0, index)].reverse().find((set) => set.weight)?.weight || "";
    const updated = { ...exercise.sets[index], weight: exercise.sets[index].weight || prior, reps: exercise.sets[index].reps || String(exercise.repMin || ""), done: true, completedAt: new Date().toISOString() };
    updateSet(index, "weight", updated.weight);
    updateSet(index, "reps", updated.reps);
    updateSet(index, "done", true);
    onSaveSet(exercise, updated);
    setState((current) => ({ ...current, activeSession: { ...current.activeSession, restUntil: Date.now() + (exercise.restSeconds || 90) * 1000 } }));
  };
  return (
    <section className="page workout-page">
      <Header title={session.name} action={<button className="button dark" onClick={onFinish}>Finish</button>} />
      <p className="timer">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")} elapsed</p>
      <article className="card">
        <div className="exercise-step">Exercise {(state.activeExerciseIndex || 0) + 1} of {session.exercises.length}</div>
        <h2 className="exercise-title">{exercise.name}</h2>
        <p className="exercise-caption">Target {exercise.targetSets} × {exercise.repMin}–{exercise.repMax}</p>
        <div className="set-head"><span>SET</span><span>PREV</span><span>LBS</span><span>REPS</span><span /></div>
        {exercise.sets.map((set, index) => (
          <div className={`set-row ${set.done ? "complete" : ""}`} key={set.id || index}>
            <span className="set-number">{set.number}</span>
            <span className="previous">—</span>
            <input className="set-input" aria-label={`Set ${index + 1} weight in pounds`} type="number" min="0" inputMode="decimal" value={set.weight} onChange={(event) => updateSet(index, "weight", event.target.value)} onBlur={() => onSaveSet(exercise, exercise.sets[index])} />
            <input className="set-input" aria-label={`Set ${index + 1} reps`} type="number" min="0" inputMode="numeric" value={set.reps} onChange={(event) => updateSet(index, "reps", event.target.value)} onBlur={() => onSaveSet(exercise, exercise.sets[index])} />
            <button className="check-set" aria-label={`Complete set ${index + 1}`} onClick={() => toggleSet(index)}>✓</button>
          </div>
        ))}
        <button className="add-set" onClick={() => onAddSet(exercise)}>+ Add set</button>
      </article>
      <div className="rest-card">
        <div><div className="rest-label">Rest</div><div className="rest-time">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</div></div>
        <button className="button light small" onClick={() => setState((current) => ({ ...current, activeSession: { ...current.activeSession, restUntil: null } }))}>Skip</button>
      </div>
      <article className="card"><p className="card-label muted-label">{(state.activeExerciseIndex || 0) + 1 < session.exercises.length ? "NEXT UP" : "WORKOUT"}</p><p className="next-up">{(state.activeExerciseIndex || 0) + 1 < session.exercises.length ? session.exercises[(state.activeExerciseIndex || 0) + 1].name : "Last exercise"}</p></article>
      <button className="button full" onClick={completeNext}>Complete set</button>
    </section>
  );
}

export default WorkoutPage;
