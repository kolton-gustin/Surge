import { useEffect, useState } from "react";
import { supabaseConfigured } from "./lib/supabaseClient.js";
import { workoutTemplates } from "./data/workouts.js";
import { addWorkoutSet, createGoal, finishWorkout as finishWorkoutRecord, loadWorkoutData, recordBodyWeight, saveSet, startWorkout } from "./lib/workoutsApi.js";
import AuthGate from "./components/AuthGate.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Modal from "./components/Modal.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import ProgressPage from "./pages/ProgressPage.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import WorkoutPage from "./pages/WorkoutPage.jsx";

const initialState = {
  sessions: [],
  goals: [],
  workoutsThisWeek: 0,
  completedToday: false,
  bodyMeasurements: [],
  activeSession: null,
  progressMode: "Lifts",
};

const PASSCODE_UNLOCK_KEY = "gym_app_unlocked";

function getSavedUnlock() {
  try {
    return window.localStorage.getItem(PASSCODE_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [page, setPage] = useState("today");
  const [modal, setModal] = useState(null);
  const [pinUnlocked, setPinUnlocked] = useState(getSavedUnlock);
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

  const unlockApp = () => {
    try { window.localStorage.setItem(PASSCODE_UNLOCK_KEY, "true"); } catch { /* Keep this unlock for the current tab if storage is unavailable. */ }
    setError("");
    setPinUnlocked(true);
  };

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
  if (!supabaseConfigured) return <main className="app-shell"><section className="page"><p className="form-error" role="alert">{error || "Supabase is not configured."}</p></section></main>;
  if (dataLoading) return <main className="app-shell"><section className="page"><p className="subtle">Loading your workouts…</p></section></main>;

  return (
    <main className="app-shell">
      {error && <div className="global-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {page === "today" && <TodayPage state={state} onStart={beginWorkout} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} />}
      {page === "workout" && <WorkoutPage state={state} setState={setState} onFinish={() => setModal("finish")} onSaveSet={handleSaveSet} onAddSet={handleAddSet} />}
      {page === "progress" && <ProgressPage state={state} setState={setState} onChange={() => setModal(state.progressMode === "Body" ? "progress" : "strength-info")} />}
      {page === "goals" && <GoalsPage state={state} onNewGoal={() => setModal("goal")} />}
      {page !== "workout" && <BottomNav page={page} onNavigate={setPage} />}
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
    </main>
  );
}
