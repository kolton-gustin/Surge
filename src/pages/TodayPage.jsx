import { workoutTemplates } from "../data/workouts.js";
import Header from "../components/Header.jsx";

function TodayPage({ state, onStart, selectedTemplate, onSelectTemplate }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  const completedCount = Math.min(state.workoutsThisWeek, workoutTemplates.length);
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
            {workoutTemplates.map((sessionTemplate, index) => {
              const isDone = index < completedCount;
              const isSelected = template.key === sessionTemplate.key;
              return (
                <button
                  className={`day session-slot ${isDone ? "done" : ""} ${isSelected ? "selected" : ""}`}
                  key={sessionTemplate.key}
                  onClick={() => onSelectTemplate(sessionTemplate.key)}
                  aria-label={`Select Session ${index + 1}: ${sessionTemplate.name}`}
                  aria-pressed={isSelected}
                >
                  <span className="day-dot">{isDone ? "✓" : index + 1}</span>
                  <span className="session-number">Session {index + 1}</span>
                  <span className="session-name">{sessionTemplate.name}</span>
                </button>
              );
            })}
          </div>
        </article>
        <div className="stats">
          <article className="stat"><div className="stat-label">Workouts</div><div className="stat-value">{state.workoutsThisWeek} / 4</div></article>
          <article className="stat"><div className="stat-label">Workout status</div><div className="stat-value status-value">{state.activeSession ? "In progress" : state.completedToday ? "Complete" : "Ready to start"}</div></article>
        </div>
      </section>
    </>
  );
}

export default TodayPage;
