import { useState } from "react";
import Header from "../components/Header.jsx";
import { getGoalProgress } from "../lib/goals.js";
import "./GoalsPage.css";

const typeLabels = {
  estimated_1rm: "Strength goal",
  body_weight: "Body weight goal",
  weekly_workouts: "Weekly goal",
};

function formatNumber(value) {
  return Number(value).toLocaleString("en", { maximumFractionDigits: 1 });
}

function formatQuantity(value, goal) {
  if (goal.type === "weekly_workouts") return `${formatNumber(value)} ${Math.abs(value) === 1 ? "workout" : "workouts"}`;
  return `${formatNumber(value)} lb`;
}

function dueLabel(goal, reached) {
  if (goal.type === "weekly_workouts") return "Resets Monday";
  if (!goal.targetDate) return null;
  const due = new Date(`${goal.targetDate}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = due.toLocaleDateString("en", { month: "short", day: "numeric" });
  return due < today && !reached ? `Past due · ${date}` : `Due ${date}`;
}

function GoalCard({ goal, completed, onComplete, onReopen, onDelete, busy }) {
  const { percent, remaining, reached } = getGoalProgress(goal);
  const waitingForLog = !goal.hasActivity && goal.type !== "weekly_workouts";
  const status = completed ? "Completed" : waitingForLog ? "Waiting for first log" : reached ? "Target reached" : `${formatQuantity(remaining, goal)} to go`;
  const due = completed
    ? new Date(goal.completedAt).toLocaleDateString("en", { month: "short", day: "numeric" })
    : dueLabel(goal, reached);

  return (
    <article className={`card goals-card${reached && !completed ? " reached" : ""}`}>
      <div className="goals-card-top">
        <div>
          <span className="goals-type">{typeLabels[goal.type] || "Goal"}</span>
          <h2>{goal.name}</h2>
        </div>
        <span className="goals-percent">{percent}%</span>
      </div>
      <div className="goals-values">
        <div><span>{waitingForLog ? "Starting" : "Current"}</span><strong>{formatQuantity(goal.current, goal)}</strong></div>
        <div><span>Target</span><strong>{formatQuantity(goal.target, goal)}</strong></div>
      </div>
      <div className="goals-track" role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="goals-card-footer">
        <strong>{status}</strong>
        {due && <span>{due}</span>}
      </div>
      <div className="goals-card-actions">
        <button type="button" disabled={busy} onClick={() => completed ? onReopen(goal.id) : onComplete(goal.id)}>
          {completed ? "Reopen goal" : "Mark complete"}
        </button>
        <button type="button" className="goals-delete-button" disabled={busy} onClick={() => onDelete(goal)}>Delete</button>
      </div>
    </article>
  );
}

function GoalsPage({ state, onNewGoal, onComplete, onReopen, onDelete, busy }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const goals = showCompleted ? state.completedGoals : state.goals;

  return (
    <section className="page goals-page">
      <Header
        eyebrow="Your targets"
        title="Goals"
        action={(state.goals.length > 0 || showCompleted) && <button type="button" className="button small goals-new-button" onClick={onNewGoal}>+ New goal</button>}
      />
      <div className="goals-summary">
        <div><span>Active goals</span><strong>{state.goals.length}</strong></div>
        <div><span>Completed goals</span><strong>{state.completedGoals.length}</strong></div>
      </div>
      <div className="goals-tabs" role="group" aria-label="Goal view">
        <button type="button" className={!showCompleted ? "active" : ""} aria-pressed={!showCompleted} onClick={() => setShowCompleted(false)}>Active ({state.goals.length})</button>
        <button type="button" className={showCompleted ? "active" : ""} aria-pressed={showCompleted} onClick={() => setShowCompleted(true)}>Completed ({state.completedGoals.length})</button>
      </div>
      {goals.length ? goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} completed={showCompleted} onComplete={onComplete} onReopen={onReopen} onDelete={onDelete} busy={busy} />
      )) : (
        <article className="card goals-empty">
          <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" /><circle cx="24" cy="24" r="10" /><circle cx="24" cy="24" r="2" /></svg>
          <h2>{showCompleted ? "No completed goals" : "Set your first goal"}</h2>
          <p>{showCompleted ? "Goals you mark complete will appear here. You can reopen them anytime." : "Choose a strength, body weight, or weekly workout target to track."}</p>
          {!showCompleted && <button type="button" className="button" onClick={onNewGoal}>Create a goal</button>}
        </article>
      )}
    </section>
  );
}

export default GoalsPage;
