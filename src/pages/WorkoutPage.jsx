import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import "./WorkoutPage.css";

function Sets({ exercise, change, toggle, add, remove, busy }) {
  const extra = exercise.sets.filter((set) => set.number > exercise.targetSets).at(-1);
  return <div className="superset-exercise"><h2 className="exercise-title">{exercise.name}</h2><div className="set-head"><span>SET</span><span>PREV</span><span>LBS</span><span>REPS</span><span>DONE</span></div>{exercise.sets.map((set, index) => <div className={`set-row ${set.done ? "complete" : ""}`} key={set.id || index}><span className="set-number">{set.number}</span><span className="previous">{set.previousWeight || "—"}</span><input className="set-input" aria-label={`${exercise.name} set ${index + 1} weight`} type="number" min="0" value={set.weight} onChange={(event) => change(exercise, index, "weight", event.target.value)} onBlur={() => change(exercise, index, "save")} /><input className="set-input" aria-label={`${exercise.name} set ${index + 1} reps`} type="number" min="0" value={set.reps} onChange={(event) => change(exercise, index, "reps", event.target.value)} onBlur={() => change(exercise, index, "save")} /><button type="button" className="check-set" aria-pressed={set.done} onClick={() => toggle(exercise, index)}>✓</button></div>) }<div className="set-actions"><button type="button" className="add-set" disabled={busy} onClick={() => add(exercise)}>+ Add set</button>{extra && <button type="button" className="remove-added-set" disabled={busy} onClick={() => remove(exercise, extra)}>Remove last set</button>}</div></div>;
}

function WorkoutPage({ state, setState, onFinish, onSaveSet, onAddSet, onRemoveSet, busy }) {
  const [, tick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => tick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  const session = state.activeSession;
  const index = state.activeExerciseIndex || 0;
  const current = session?.exercises?.[index];
  if (!session || !current) return <section className="page"><p className="subtle">No active workout. Start one from Today.</p></section>;
  const group = current.supersetGroup ? session.exercises.filter((item) => item.supersetGroup === current.supersetGroup) : [current];
  const groupEnd = Math.max(...group.map((item) => session.exercises.findIndex((exercise) => exercise.id === item.id)));
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
  const rest = session.restUntil ? Math.max(0, Math.ceil((session.restUntil - Date.now()) / 1000)) : 0;
  const change = (exercise, setIndex, field, value) => {
    const saving = field === "save";
    setState((old) => ({ ...old, activeSession: { ...old.activeSession, exercises: old.activeSession.exercises.map((item) => item.id === exercise.id ? { ...item, sets: item.sets.map((set, i) => i === setIndex && !saving ? { ...set, [field]: value } : set) } : item) } }));
    if (saving) onSaveSet(exercise, exercise.sets[setIndex]);
  };
  const toggle = (exercise, setIndex) => {
    const set = exercise.sets[setIndex]; const done = !set.done;
    const previous = [...exercise.sets.slice(0, setIndex)].reverse().find((item) => item.weight)?.weight || "";
    const updated = { ...set, weight: done ? set.weight || previous : set.weight, reps: done ? set.reps || String(exercise.repMin) : set.reps, done, completedAt: done ? new Date().toISOString() : null };
    const roundComplete = done && group.every((item) => item.id === exercise.id || item.sets[setIndex]?.done);
    setState((old) => ({ ...old, activeSession: { ...old.activeSession, restUntil: roundComplete ? Date.now() + (exercise.restSeconds || 90) * 1000 : null, exercises: old.activeSession.exercises.map((item) => item.id === exercise.id ? { ...item, sets: item.sets.map((entry, i) => i === setIndex ? updated : entry) } : item) } }));
    onSaveSet(exercise, updated);
  };
  const completeGroup = group.every((item) => item.sets.length && item.sets.every((set) => set.done));
  const completed = session.exercises.filter((item) => item.sets.length && item.sets.every((set) => set.done)).length;
  const finished = completed === session.exercises.length;
  const next = session.exercises[groupEnd + 1];
  return <section className="page workout-page"><Header eyebrow="Workout in progress" title={session.name} /><div className="workout-summary"><div className="workout-summary-row"><div className="workout-metric"><span>Elapsed</span><strong>{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</strong></div><div className="workout-metric workout-metric-right"><span>Exercises completed</span><strong>{completed}<small> / {session.exercises.length}</small></strong></div></div><div className="workout-progress-track"><span style={{ width: `${Math.round(completed / session.exercises.length * 100)}%` }} /></div></div><article className="card exercise-card"><div className="exercise-topline"><span className="exercise-step">{group.length > 1 ? `Superset · exercises ${index + 1}–${groupEnd + 1}` : `Exercise ${index + 1} of ${session.exercises.length}`}</span><span className="exercise-target">{current.targetSets} sets · {current.repMin}–{current.repMax} reps</span></div>{group.map((exercise) => <Sets key={exercise.id} exercise={exercise} change={change} toggle={toggle} add={onAddSet} remove={onRemoveSet} busy={busy} />)}</article><div className={`rest-card ${rest > 0 ? "running" : ""}`}><div className="rest-details"><span className="rest-label">Rest timer</span><strong className="rest-time">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</strong><span className="rest-hint">{rest > 0 ? "Recover before your next set" : group.length > 1 ? "Starts after both superset exercises" : "Starts when you complete a set"}</span></div>{rest > 0 && <button type="button" className="rest-skip" onClick={() => setState((old) => ({ ...old, activeSession: { ...old.activeSession, restUntil: null } }))}>Skip</button>}</div>{finished ? <button type="button" className="finish-workout-cta" disabled={busy} onClick={onFinish}><span className="finish-cta-copy"><span className="finish-cta-label">All exercises complete</span><strong>Finish workout</strong></span><span className="finish-cta-arrow">→</span></button> : next ? <button type="button" className={`next-exercise-card ${completeGroup && !busy ? "ready" : ""}`} disabled={!completeGroup || busy} onClick={() => setState((old) => ({ ...old, activeExerciseIndex: groupEnd + 1 }))}><span className="next-card-copy"><span className="next-card-label">Next exercise</span><strong className="next-up">{next.name}</strong><span className="next-card-hint">{completeGroup ? "Continue workout" : "Complete all sets to continue"}</span></span><span className="next-card-arrow">→</span></button> : null}</section>;
}

export default WorkoutPage;
