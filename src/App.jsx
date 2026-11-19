import { useEffect, useLayoutEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabaseClient.js";
import { addWorkoutSet, cancelWorkout, createGoal, deleteGoal, deleteWorkoutTemplate, finishWorkout as finishWorkoutRecord, loadWorkoutData, loadWorkoutTemplates, recordBodyWeight, removeWorkoutSet, saveRunDetails, saveSet, saveWorkoutTemplate, setGoalCompleted, startWorkout } from "./lib/workoutsApi.js";
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
  workoutLog: [],
  activeSession: null,
  progressMode: "Lifts",
};

const activeExerciseStorageKey = (sessionId) => `surge_active_exercise_${sessionId}`;

function savedActiveExerciseIndex(sessionId) {
  if (!sessionId) return 0;
  try {
    const value = Number(window.localStorage.getItem(activeExerciseStorageKey(sessionId)));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [page, setPage] = useState("today");
  const [modal, setModal] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);

  const refresh = async (currentTemplates = templates) => {
    const data = await loadWorkoutData(currentTemplates);
    setState((current) => ({ ...initialState, ...data, progressMode: current.progressMode, selectedLiftKey: current.selectedLiftKey, activeExerciseIndex: Math.min(current.activeExerciseIndex || 0, Math.max(0, (data.activeSession?.exercises.length || 1) - 1)) }));
    return data;
  };

  // Every app view owns its own scroll position. Reset it before and after a
  // page swap so Mobile Safari cannot carry a nested scroll offset from the
  // finished workout into Today (especially after the keyboard was open).
  useLayoutEffect(() => {
    const resetViewport = () => {
      const appPage = document.querySelector(".app-shell .page");
      appPage?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    };
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    resetViewport();
    const frame = window.requestAnimationFrame(resetViewport);
    const timer = window.setTimeout(resetViewport, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [page]);

  useEffect(() => {
    if (!supabaseConfigured) { setAuthLoading(false); return undefined; }
    let alive = true;
    supabase.auth.getSession().then(({ data: { session: savedSession } }) => {
      if (alive) { setSession(savedSession); setAuthLoading(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) { setSession(nextSession); setAuthLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setState(initialState); setDataLoading(false); return undefined; }
    if (!supabaseConfigured) {
      setError("Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.");
      setDataLoading(false);
      return undefined;
    }
    let alive = true;
    setDataLoading(true);
    Promise.all([loadWorkoutTemplates(),]).then(async ([loadedTemplates]) => {
      const data = await loadWorkoutData(loadedTemplates);
      if (!alive) return;
      setTemplates(loadedTemplates);
      setState((current) => ({
        ...initialState,
        ...data,
        progressMode: current.progressMode,
        selectedLiftKey: current.selectedLiftKey,
        activeExerciseIndex: Math.min(
          savedActiveExerciseIndex(data.activeSession?.id),
          Math.max(0, (data.activeSession?.exercises.length || 1) - 1),
        ),
      }));
      setSelectedTemplate(data.nextTemplateKey);
      if (data.activeSession) setPage("workout");
    }).catch((loadError) => { if (alive) setError(loadError.message); })
      .finally(() => { if (alive) setDataLoading(false); });
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    const sessionId = state.activeSession?.id;
    if (!sessionId) return;
    try {
      window.localStorage.setItem(activeExerciseStorageKey(sessionId), String(state.activeExerciseIndex || 0));
    } catch {
      // The workout can still be resumed from the beginning if storage is unavailable.
    }
  }, [state.activeSession?.id, state.activeExerciseIndex]);

  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(() => setCelebrating(false), 2400);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const signIn = ({ email, password }) => runAction(async () => {
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
  });
  const register = ({ email, password }) => runAction(async () => {
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;
    if (!data.session) setError("Check your email to confirm your account, then sign in.");
  });
  const signOut = () => runAction(async () => {
    const { error: authError } = await supabase.auth.signOut();
    if (authError) throw authError;
  });

  const navigate = (nextPage) => {
    // A focused number field can leave Mobile Safari's nested scroller offset
    // after switching tabs. Close its keyboard before replacing the page.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      document.querySelector(".app-shell .page")?.scrollTo(0, 0);
    });
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
      if (!template) throw new Error("Create a workout in Edit before starting.");
      await startWorkout(template);
    }
    await refresh();
    setPage("workout");
  });

  const handleFinish = () => runAction(async () => {
    if (state.activeSession.workoutType === "Run") await saveRunDetails(state.activeSession.id, state.activeSession.runDistance, state.activeSession.runPace);
    await finishWorkoutRecord(state.activeSession.id);
    try { window.localStorage.removeItem(activeExerciseStorageKey(state.activeSession.id)); } catch { /* No stored position to remove. */ }
    const data = await refresh();
    setSelectedTemplate(data.nextTemplateKey);
    setPage("today");
    setCelebrating(true);
  });

  const handleCancelWorkout = () => runAction(async () => {
    if (!state.activeSession) return;
    const sessionId = state.activeSession.id;
    await cancelWorkout(sessionId);
    try { window.localStorage.removeItem(activeExerciseStorageKey(sessionId)); } catch { /* No stored position to remove. */ }
    await refresh();
    setModal(null);
    setPage("today");
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

  if (!supabaseConfigured) return <main className="app-shell"><section className="page"><p className="form-error" role="alert">{error || "Supabase is not configured."}</p></section></main>;
  if (authLoading) return <main className="app-shell"><section className="page"><p className="subtle">Loading your account…</p></section></main>;
  if (!session) return <main className="app-shell"><AuthGate onSignIn={signIn} onRegister={register} error={error} busy={busy} /></main>;
  if (dataLoading) return <main className="app-shell"><section className="page"><p className="subtle">Loading your workouts…</p></section></main>;

  return (
    <main className="app-shell">
      {error && <div className="global-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {page === "today" && <><div className="app-tools"><button type="button" className="auth-switch" onClick={signOut}>Sign out</button></div><TodayPage state={state} templates={templates} onStart={beginWorkout} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} onEditWorkouts={() => setModal("workouts")} /></>}
      {page === "workout" && <WorkoutPage state={state} setState={setState} onFinish={handleFinish} onCancel={() => setModal("cancel-workout")} onSaveSet={handleSaveSet} onAddSet={handleAddSet} onRemoveSet={handleRemoveSet} busy={busy} />}
      {page === "progress" && <ProgressPage state={state} templates={templates} setState={setState} onLogWeight={() => setModal("progress")} />}
      {page === "goals" && <GoalsPage state={state} onNewGoal={() => setModal("goal")} onComplete={(goalId) => changeGoalCompleted(goalId, true)} onReopen={(goalId) => changeGoalCompleted(goalId, false)} onDelete={(goal) => { setGoalToDelete(goal); setModal("delete-goal"); }} busy={busy} />}
      {page !== "workout" && <BottomNav page={page} onNavigate={navigate} />}
      {modal === "goal" && <Modal title="New goal" onClose={() => setModal(null)} onSubmit={submitGoal}>
        <GoalFields state={state} templates={templates} />
      </Modal>}
      {modal === "workouts" && <WorkoutLibrary templates={templates} onSave={saveTemplate} onDelete={removeTemplate} onClose={() => setModal(null)} busy={busy} />}
      {modal === "delete-goal" && goalToDelete && <Modal title="Delete goal?" onClose={() => { setModal(null); setGoalToDelete(null); }} onSubmit={submitDeleteGoal} submitLabel="Delete goal" busy={busy}>
        <p className="subtle">Delete “{goalToDelete.name}” permanently? This cannot be undone.</p>
      </Modal>}
      {modal === "cancel-workout" && <Modal title="Discard workout?" onClose={() => setModal(null)} onSubmit={(event) => { event.preventDefault(); handleCancelWorkout(); }} submitLabel="Discard workout" busy={busy}>
        <p className="subtle">This will permanently remove this in-progress workout and all sets you entered. It will not appear in your history.</p>
      </Modal>}
      {modal === "progress" && <Modal title="Log body weight" onClose={() => setModal(null)} onSubmit={submitProgress}>
        <label className="field">Weight (lb)<input name="value" type="number" min="0.1" step="0.1" required /></label>
      </Modal>}
      {celebrating && <WorkoutCelebration />}
    </main>
  );
}
