import Header from "../components/Header.jsx";

function ProgressPage({ state, setState, onChange }) {
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
    </>
  );
}

export default ProgressPage;
