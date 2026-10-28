import { useEffect, useState } from "react";
import { supabaseConfigured } from "./lib/supabaseClient.js";
import { workoutTemplates } from "./data/workouts.js";
import { addWorkoutSet, createGoal, finishWorkout as finishWorkoutRecord, loadWorkoutData, recordBodyWeight, saveSet, startWorkout } from "./lib/workoutsApi.js";

const initialState = {
  sessions: [],
  goals: [],
  workoutsThisWeek: 0,
  completedDays: [],
  bodyMeasurements: [],
  activeSession: null,
  progressMode: "Lifts",
};

const APP_PASSCODE = import.meta.env.VITE_PASSCODE;

function AuthGate({ onSubmit, error, busy }) {
  const [passcode, setPasscode] = useState("");
  const [localError, setLocalError] = useState("");
  const configured = Boolean(APP_PASSCODE);

  function handleSubmit(event) {
    event.preventDefault();
    if (passcode !== APP_PASSCODE) {
      setLocalError("Incorrect passcode.");
      return;
    }
    setLocalError("");
    onSubmit();
  }

  return (
    <section className="page">
      <Header title="Enter passcode" />
      <form className="card auth-card" onSubmit={handleSubmit}>
        {!configured && <p className="form-error">Set VITE_PASSCODE in your environment to enable the passcode gate.</p>}
        <label className="field">Passcode<input type="password" inputMode="numeric" autoComplete="current-password" value={passcode} onChange={(event) => { setPasscode(event.target.value); setLocalError(""); }} autoFocus required /></label>
        {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
        <button className="button full" disabled={busy || !configured}>{busy ? "Checking…" : "Unlock"}</button>
      </form>
    </section>
  );
}

function Header({ eyebrow, title, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="title">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function BottomNav({ page, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {[["today", "Today"], ["progress", "Progress"], ["goals", "Goals"]].map(([key, label]) => (
        <button key={key} className={`nav-button ${page === key ? "active" : ""}`} onClick={() => onNavigate(key)}>
          {label}
        </button>
      ))}
    </nav>
  );
}

function Modal({ title, children, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSubmit}>
        <h2>{title}</h2>
        {children}
        <div className="modal-actions">
          <button type="button" className="button outline" onClick={onClose}>Cancel</button>
          <button className="button" type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}

function TodayPage({ state, onStart, onNavigate, selectedTemplate, onSelectTemplate }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  const week = [["M", "Upper A", "upper_a"], ["T", "Lower A", "lower_a"], ["Th", "Upper B", "upper_b"], ["F", "Lower B", "lower_b"]];
  const template = workoutTemplates.find((item) => item.key === selectedTemplate) || workoutTemplates[1];
  return (
    <>
      <section className="page">
        <Header eyebrow={today} title="Today" />
        <article className="card">
          <p className="card-label">UP NEXT</p>
          <select className="template-select" aria-label="Choose workout" value={template.key} onChange={(event) => onSelectTemplate(event.target.value)}>
            {workoutTemplates.map((item) => <option value={item.key} key={item.key}>{item.name}</option>)}
          </select>
          <p className="subtle">{template.description}</p>
          <button className="button full" onClick={onStart}>{state.activeSession ? "Resume workout" : "Start workout"}</button>
        </article>
        <article className="card">
          <h2 className="section-title">This week</h2>
          <div className="week">
            {week.map(([day, name, key], index) => (
              <button className={`day ${state.completedDays.includes(day) ? "done" : template.key === key ? "current" : ""}`} key={day} onClick={() => onSelectTemplate(key)}>
                <div className="day-dot">{day}</div>{name}
              </button>
            ))}
          </div>
        </article>
        <div className="stats">
          <article className="stat"><div className="stat-label">Workouts</div><div className="stat-value">{state.workoutsThisWeek} / 4</div></article>
          <article className="stat"><div className="stat-label">Active</div><div className="stat-value">{state.activeSession ? "In progress" : "Ready"}</div></article>
        </div>
      </section>
      <BottomNav page="today" onNavigate={onNavigate} />
    </>
  );
}

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

function ProgressPage({ state, setState, onChange, onNavigate }) {
  const body = state.progressMode === "Body";
  const chartValues = body
    ? state.bodyMeasurements.slice(0, 8).reverse().map((item) => Number(item.weight_kg) * 2.2046226)
    : state.sessions.slice(0, 8).reverse().map((item) => {
      const [weight, reps] = String(item.lift).split("×").map(Number);
      return Number.isFinite(weight) && Number.isFinite(reps) && reps > 0 ? weight * (1 + reps / 30) : null;
    }).filter((value) => value != null);
  const minValue = chartValues.length ? Math.min(...chartValues) : 0;
  const maxValue = chartValues.length ? Math.max(...chartValues) : 0;
  const chartPoints = chartValues.map((value, index) => {
    const x = chartValues.length < 2 ? 160 : 4 + index * (308 / (chartValues.length - 1));
    const y = maxValue === minValue ? 62 : 18 + ((maxValue - value) / (maxValue - minValue)) * 88;
    return `${x},${y}`;
  }).join(" ");
  return (
    <>
      <section className="page">
        <Header eyebrow="Strength" title="Progress" />
        <div className="segmented">
          {["Lifts", "Body"].map((mode) => <button key={mode} className={`segment ${state.progressMode === mode ? "active" : ""}`} onClick={() => setState((current) => ({ ...current, progressMode: mode }))}>{mode}</button>)}
        </div>
        <div className="lift-heading"><h2>{body ? "Body weight" : "Back squat"}</h2><button className="text-button" onClick={onChange}>Change</button></div>
        <div className="stat-grid">
          <article className="card"><div className="stat-label">{body ? "Current weight" : "Est. 1RM"}</div><div className="stat-value">{body ? `${state.bodyMeasurements[0] ? Math.round(Number(state.bodyMeasurements[0].weight_kg) * 2.2046226) : "—"} lb` : `${state.goals.find((goal) => goal.type === "estimated_1rm")?.current ?? "—"} lb`}</div><div className="subtle accent-subtle">{body ? "Latest measurement" : "From your logged sets"}</div></article>
          <article className="card"><div className="stat-label">Best set</div><div className="stat-value">{state.sessions[0]?.lift || "—"}</div><div className="subtle">{state.sessions[0]?.date || "No sessions yet"}</div></article>
        </div>
        <article className="card chart-card">
          <p className="chart-title">{body ? "Body weight" : "Est. 1RM"} · last 8 weeks</p>
          {chartValues.length ? <svg className="chart" viewBox="0 0 320 125" role="img" aria-label={`${body ? "Body weight" : "Estimated one rep max"} history`}><path d="M4 18H316 M4 62H316 M4 106H316" stroke="#e6e7e2" />{chartValues.length > 1 && <polyline points={chartPoints} fill="none" stroke="#9e2921" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}<circle cx={chartValues.length < 2 ? 160 : 312} cy={chartValues.length < 2 ? 62 : Number(chartPoints.split(" ").at(-1)?.split(",")[1] || 62)} r="5" fill="#9e2921" /></svg> : <div className="chart-empty">{body ? "Log a few weigh-ins to see your trend." : "Complete workouts to build your lift history."}</div>}
          <div className="goal-meta"><span>{state.sessions.at(-1)?.date || "First workout"}</span><span>{state.sessions[0]?.date || "Today"}</span></div>
        </article>
        <article className="card"><h2 className="section-title">Recent sessions</h2><div className="recent-list">
          {state.sessions.slice(0, 3).map((session, index) => <div className="recent-row" key={`${session.date}-${index}`}><div><span className="recent-date">{session.date}</span>&nbsp;&nbsp;{session.name}</div><strong>{session.lift}</strong></div>)}
        </div></article>
      </section>
      <BottomNav page="progress" onNavigate={onNavigate} />
    </>
  );
}

function goalPercent(goal) {
  const span = goal.target - goal.start;
  if (!span) return 0;
  return Math.max(0, Math.min(100, Math.round(((goal.current - goal.start) / span) * 100)));
}

function GoalsPage({ state, onNewGoal, onNavigate }) {
  return (
    <>
      <section className="page">
        <Header eyebrow="Set targets" title="Goals" action={<button className="button small" onClick={onNewGoal}>+ New</button>} />
        {state.goals.map((goal) => {
          const percent = goalPercent(goal);
          const remaining = Math.abs(goal.target - goal.current);
          return (
            <article className="card goal-card" key={goal.id}>
              <div className="goal-heading"><h2 className="goal-name">{goal.name} {goal.type === "weekly_workouts" ? `· ${goal.target}` : `${goal.target} ${goal.unit}`}</h2><span className="goal-percent">{percent}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
              <div className="goal-meta"><span>{remaining === 0 ? "Target reached" : `${goal.current} ${goal.unit} now · ${remaining} to go`}</span><span>{goal.due === "Weekly" ? "Weekly" : `Target ${goal.due}`}</span></div>
            </article>
          );
        })}
      </section>
      <BottomNav page="goals" onNavigate={onNavigate} />
    </>
  );
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [page, setPage] = useState("today");
  const [modal, setModal] = useState(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("lower_a");

  const refresh = async () => {
    const data = await loadWorkoutData();
    setState((current) => ({ ...initialState, ...data, progressMode: current.progressMode, activeExerciseIndex: Math.min(current.activeExerciseIndex || 0, Math.max(0, (data.activeSession?.exercises.length || 1) - 1)) }));
  };

  useEffect(() => {
    if (!pinUnlocked) { setState(initialState); setDataLoading(false); return undefined; }
    if (!supabaseConfigured) {
      setError("Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.");
      setDataLoading(false);
      return undefined;
    }
    let alive = true;
    setDataLoading(true);
    loadWorkoutData().then((data) => {
      if (!alive) return;
      setState((current) => ({ ...initialState, ...data, progressMode: current.progressMode, activeExerciseIndex: 0 }));
      if (data.activeSession) setPage("workout");
    }).catch((loadError) => { if (alive) setError(loadError.message); })
      .finally(() => { if (alive) setDataLoading(false); });
    return () => { alive = false; };
  }, [pinUnlocked]);

  const unlockApp = () => { setError(""); setPinUnlocked(true); };

  const runAction = async (action) => {
    setBusy(true); setError("");
    try { await action(); }
    catch (actionError) { setError(actionError.message || "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  const beginWorkout = () => runAction(async () => {
    if (!state.activeSession) await startWorkout(selectedTemplate);
    await refresh();
    setPage("workout");
  });

  const submitFinish = async (event) => {
    event.preventDefault();
    await runAction(async () => {
      await finishWorkoutRecord(state.activeSession.id);
      await refresh();
      setModal(null); setPage("today");
    });
  };

  const handleSaveSet = (exercise, set) => runAction(() => saveSet(exercise.id, set));
  const handleAddSet = (exercise) => runAction(async () => {
    const set = await addWorkoutSet(exercise.id, exercise.sets);
    setState((current) => ({ ...current, activeSession: { ...current.activeSession, exercises: current.activeSession.exercises.map((item) => item.id === exercise.id ? { ...item, sets: [...item.sets, set] } : item) } }));
  });

  const submitGoal = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("type") === "estimated_1rm" && !data.get("exerciseKey")) {
      setError("Choose an exercise for a lift goal.");
      return;
    }
    await runAction(async () => {
      await createGoal({ type: data.get("type"), name: String(data.get("name")).trim(), start: Number(data.get("start")), target: Number(data.get("target")), exerciseKey: data.get("exerciseKey") || null, due: data.get("due") || null });
      await refresh(); setModal(null);
    });
  };

  const submitProgress = async (event) => {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("value"));
    await runAction(async () => { await recordBodyWeight(value); await refresh(); setModal(null); });
  };

  if (!pinUnlocked) return <main className="app-shell"><AuthGate onSubmit={unlockApp} error={error} busy={busy} /></main>;
  if (!supabaseConfigured) return <main className="app-shell"><section className="page"><p className="form-error" role="alert">{error || "Supabase is not configured."}</p><button className="button" onClick={() => setPinUnlocked(false)}>Lock app</button></section></main>;
  if (dataLoading) return <main className="app-shell"><section className="page"><p className="subtle">Loading your workouts…</p></section></main>;

  return (
    <main className="app-shell">
      {error && <div className="global-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {page === "today" && <TodayPage state={state} onStart={beginWorkout} onNavigate={setPage} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} />}
      {page === "workout" && <WorkoutPage state={state} setState={setState} onFinish={() => setModal("finish")} onSaveSet={handleSaveSet} onAddSet={handleAddSet} />}
      {page === "progress" && <ProgressPage state={state} setState={setState} onChange={() => setModal(state.progressMode === "Body" ? "progress" : "strength-info")} onNavigate={setPage} />}
      {page === "goals" && <GoalsPage state={state} onNewGoal={() => setModal("goal")} onNavigate={setPage} />}
      {modal === "finish" && <Modal title="Finish workout?" onClose={() => setModal(null)} onSubmit={submitFinish}><p className="subtle">Save this session to your progress?</p></Modal>}
      {modal === "goal" && <Modal title="New goal" onClose={() => setModal(null)} onSubmit={submitGoal}>
        <label className="field">Goal name<input name="name" placeholder="e.g. Deadlift" required /></label>
        <label className="field">Goal type<select name="type"><option value="estimated_1rm">Estimated lift max</option><option value="body_weight">Body weight</option><option value="weekly_workouts">Weekly workouts</option></select></label>
        <label className="field">Exercise<select name="exerciseKey"><option value="">Only needed for a lift goal</option>{workoutTemplates.flatMap((template) => template.exercises).filter((exercise, index, all) => all.findIndex((item) => item.key === exercise.key) === index).map((exercise) => <option value={exercise.key} key={exercise.key}>{exercise.name}</option>)}</select></label>
        <label className="field">Starting value (lb, or workouts)<input name="start" type="number" min="0" defaultValue="0" required /></label>
        <label className="field">Target value<input name="target" type="number" min="1" defaultValue="100" required /></label>
        <label className="field">Target date<input name="due" type="date" /></label>
        <p className="subtle">Current progress is calculated from your logged sets, measurements, or completed workouts.</p>
      </Modal>}
      {modal === "progress" && <Modal title="Log body weight" onClose={() => setModal(null)} onSubmit={submitProgress}>
        <label className="field">Weight (lb)<input name="value" type="number" min="0" step="0.1" required /></label>
      </Modal>}
      {modal === "strength-info" && <Modal title="Strength progress" onClose={() => setModal(null)} onSubmit={(event) => { event.preventDefault(); setModal(null); }}><p className="subtle">Estimated lift progress is calculated from completed sets. Log a set in a workout to update it.</p></Modal>}
      <div className="app-tools"><button className="text-button" disabled={busy} onClick={() => { setError(""); setPinUnlocked(false); }}>Lock app</button></div>
    </main>
  );
}
