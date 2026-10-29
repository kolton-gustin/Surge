import Header from "../components/Header.jsx";

function goalPercent(goal) {
  const span = goal.target - goal.start;
  if (!span) return 0;
  return Math.max(0, Math.min(100, Math.round(((goal.current - goal.start) / span) * 100)));
}

function GoalsPage({ state, onNewGoal }) {
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
    </>
  );
}

export default GoalsPage;
