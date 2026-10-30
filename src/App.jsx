import { useEffect, useState } from "react";
import { supabaseConfigured } from "./lib/supabaseClient.js";
import { workoutTemplates } from "./data/workouts.js";
import { addWorkoutSet, createGoal, deleteGoal, deleteWorkoutTemplate, finishWorkout as finishWorkoutRecord, loadWorkoutData, loadWorkoutTemplates, recordBodyWeight, removeWorkoutSet, saveSet, saveWorkoutTemplate, setGoalCompleted, startWorkout } from "./lib/workoutsApi.js";
import AuthGate from "./components/AuthGate.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Modal from "./components/Modal.jsx";
import GoalFields from "./components/GoalFields.jsx";
import WorkoutCelebration from "./components/WorkoutCelebration.jsx";
import WorkoutLibrary from "./components/WorkoutLibrary.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import ProgressPage from "./pages/ProgressPage.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import WorkoutPage from "./pages/WorkoutPage.jsx";

const initialState = {
  sessions: [],
  strengthHistory: [],
  selectedLiftKey: null,
  goals: [],
  completedGoals: [],
  workoutsThisWeek: 0,
  completedTemplateKeysThisWeek: [],
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
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [pinUnlocked, setPinUnlocked] = useState(getSavedUnlock);
  const [dataLoading, setDataLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(workoutTemplates[0].key);
  const [templates, setTemplates] = useState(workoutTemplates);

  const refresh = async (currentTemplates = templates) => {
    const data = await loadWorkoutData(currentTemplates);
    setState((current) => ({ ...initialState, ...data, progressMode: current.progressMode, selectedLiftKey: current.selectedLiftKey, activeExerciseIndex: Math.min(current.activeExerciseIndex || 0, Math.max(0, (data.activeSession?.exercises.length || 1) - 1)) }));
    return data;
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
    Promise.all([loadWorkoutTemplates(),]).then(async ([loadedTemplates]) => {
      if (!loadedTemplates.length) throw new Error("No workouts are configured. Add a workout in the library.");
      const data = await loadWorkoutData(loadedTemplates);
      if (!alive) return;
      setTemplates(loadedTemplates);
      setState((current) => ({ ...initialState, ...data, progressMode: current.progressMode, selectedLiftKey: current.selectedLiftKey, activeExerciseIndex: 0 }));
      setSelectedTemplate(data.nextTemplateKey);
      if (data.activeSession) setPage("workout");
    }).catch((loadError) => { if (alive) setError(loadError.message); })
      .finally(() => { if (alive) setDataLoading(false); });
    return () => { alive = false; };
  }, [pinUnlocked]);

  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(() => setCelebrating(false), 2400);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

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
    if (!state.activeSession) {
      const template = templates.find((item) => item.key === selectedTemplate) || templates[0];
      await startWorkout(template);
    }
    await refresh();
    setPage("workout");
  });

  const handleFinish = () => runAction(async () => {
    await finishWorkoutRecord(state.activeSession.id);
    const data = await refresh();
    setSelectedTemplate(data.nextTemplateKey);
    setPage("today");
    setCelebrating(true);
  });

  const handleSaveSet = (exercise, set) => runAction(() => saveSet(exercise.id, set));
  const handleAddSet = (exercise) => runAction(async () => {
    const set = await addWorkoutSet(exercise.id, exercise.sets);
    const setWithPrevious = { ...set, previousWeight: exercise.previousWeights?.[set.number] ?? "" };
    setState((current) => ({ ...current, activeSession: { ...current.activeSession, exercises: current.activeSession.exercises.map((item) => item.id === exercise.id ? { ...item, sets: [...item.sets, setWithPrevious] } : item) } }));
  });
  const handleRemoveSet = (exercise, set) => runAction(async () => {
    await removeWorkoutSet(exercise.id, set);
    setState((current) => ({
      ...current,
      activeSession: {
        ...current.activeSession,
        exercises: current.activeSession.exercises.map((item) => item.id === exercise.id
          ? { ...item, sets: item.sets.filter((savedSet) => savedSet.id !== set.id) }
          : item),
      },
    }));
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

  const changeGoalCompleted = (goalId, completed) => runAction(async () => {
    await setGoalCompleted(goalId, completed);
    await refresh();
  });

  const submitDeleteGoal = (event) => {
    event.preventDefault();
    if (!goalToDelete) return;
    runAction(async () => {
      await deleteGoal(goalToDelete.id);
      await refresh();
      setModal(null);
      setGoalToDelete(null);
    });
  };

  const submitProgress = async (event) => {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("value"));
    await runAction(async () => { await recordBodyWeight(value); await refresh(); setModal(null); });
  };

  const saveTemplate = (template) => runAction(async () => {
    const savedTemplate = await saveWorkoutTemplate(template, templates);
    const nextTemplates = await loadWorkoutTemplates();
    setTemplates(nextTemplates);
    setSelectedTemplate(savedTemplate.key);
    await refresh(nextTemplates);
    setModal(null);
  });

  const removeTemplate = (template) => runAction(async () => {
    await deleteWorkoutTemplate(template.id, templates.length);
    const nextTemplates = await loadWorkoutTemplates();
    setTemplates(nextTemplates);
    setSelectedTemplate((current) => current === template.key ? nextTemplates[0].key : current);
    await refresh(nextTemplates);
    setModal(null);
  });

  if (!pinUnlocked) return <main className="app-shell"><AuthGate onSubmit={unlockApp} error={error} busy={busy} /></main>;
  if (!supabaseConfigured) return <main className="app-shell"><section className="page"><p className="form-error" role="alert">{error || "Supabase is not configured."}</p></section></main>;
  if (dataLoading) return <main className="app-shell"><section className="page"><p className="subtle">Loading your workouts…</p></section></main>;

  return (
    <main className="app-shell">
      {error && <div className="global-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {page === "today" && <TodayPage state={state} templates={templates} onStart={beginWorkout} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} onEditWorkouts={() => setModal("workouts")} />}
      {page === "workout" && <WorkoutPage state={state} setState={setState} onFinish={handleFinish} onSaveSet={handleSaveSet} onAddSet={handleAddSet} onRemoveSet={handleRemoveSet} busy={busy} />}
      {page === "progress" && <ProgressPage state={state} templates={templates} setState={setState} onLogWeight={() => setModal("progress")} />}
      {page === "goals" && <GoalsPage state={state} onNewGoal={() => setModal("goal")} onComplete={(goalId) => changeGoalCompleted(goalId, true)} onReopen={(goalId) => changeGoalCompleted(goalId, false)} onDelete={(goal) => { setGoalToDelete(goal); setModal("delete-goal"); }} busy={busy} />}
      {page !== "workout" && <BottomNav page={page} onNavigate={setPage} />}
      {modal === "goal" && <Modal title="New goal" onClose={() => setModal(null)} onSubmit={submitGoal}>
        <GoalFields state={state} templates={templates} />
      </Modal>}
      {modal === "workouts" && <WorkoutLibrary templates={templates} onSave={saveTemplate} onDelete={removeTemplate} onClose={() => setModal(null)} busy={busy} />}
      {modal === "delete-goal" && goalToDelete && <Modal title="Delete goal?" onClose={() => { setModal(null); setGoalToDelete(null); }} onSubmit={submitDeleteGoal} submitLabel="Delete goal" busy={busy}>
        <p className="subtle">Delete “{goalToDelete.name}” permanently? This cannot be undone.</p>
      </Modal>}
      {modal === "progress" && <Modal title="Log body weight" onClose={() => setModal(null)} onSubmit={submitProgress}>
        <label className="field">Weight (lb)<input name="value" type="number" min="0.1" step="0.1" required /></label>
      </Modal>}
      {celebrating && <WorkoutCelebration />}
    </main>
  );
}
