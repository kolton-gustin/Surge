import Header from "../components/Header.jsx";
import "./TodayPage.css";

function TodayPage({ state, templates, onStart, selectedTemplate, onSelectTemplate, onEditWorkouts }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  const template = templates.find((item) => item.key === selectedTemplate) || templates[0];
  const completedKeys = state.completedTemplateKeysThisWeek;
  const selectedIsComplete = completedKeys.includes(template.key);
  const selectedIsActive = state.activeSession?.templateKey === template.key;
  const workoutStatus = selectedIsActive ? "In progress" : selectedIsComplete ? "Complete" : "Ready to start";

  return (
    <section className="page today-page">
      <Header eyebrow={today} title="Today" action={<button type="button" className="today-edit-workouts" onClick={onEditWorkouts}>Edit</button>} />

      <article className="card today-card">
        <div className="today-card-header">
          <h2>Your workouts</h2>
          <span>{completedKeys.length} of {templates.length} complete</span>
        </div>
        <div className="today-session-grid">
          {templates.map((sessionTemplate, index) => {
            const isDone = completedKeys.includes(sessionTemplate.key);
            const isSelected = template.key === sessionTemplate.key;
            return (
              <button
                type="button"
                className={`today-session-tile${isSelected ? " selected" : ""}${isDone ? " done" : ""}`}
                key={sessionTemplate.key}
                onClick={() => onSelectTemplate(sessionTemplate.key)}
                aria-label={`Select Session ${index + 1}: ${sessionTemplate.name}${isDone ? ", completed this week" : ""}`}
                aria-pressed={isSelected}
              >
                <span className="today-session-index" aria-hidden="true">{isDone ? "✓" : index + 1}</span>
                <span className="today-session-copy">
                  <span className="today-session-number">Session {index + 1}</span>
                  <strong className="today-session-name">{sessionTemplate.name}</strong>
                  <span className="today-session-description">{sessionTemplate.description}</span>
                </span>
                {isDone && <span className="today-session-status">Complete</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="button full today-start" onClick={onStart}>
          {state.activeSession ? "Resume workout" : "Start Workout"}
        </button>
      </article>

      <article className="card today-card today-overview">
        <div className="today-card-header">
          <h2>Overview</h2>
        </div>
        <div className="today-overview-grid">
          <div className="today-overview-item">
            <span>Workouts this week</span>
            <strong>{state.workoutsThisWeek} <small>/ {templates.length}</small></strong>
          </div>
          <div className="today-overview-item">
            <span>Selected workout</span>
            <strong className="today-overview-status">{workoutStatus}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}

export default TodayPage;
