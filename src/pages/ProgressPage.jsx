import { workoutTemplates } from "../data/workouts.js";
import Header from "../components/Header.jsx";
import "./ProgressPage.css";

const exerciseOptions = workoutTemplates.flatMap((template) => template.exercises)
  .filter((exercise, index, all) => all.findIndex((item) => item.key === exercise.key) === index);
const kilogramsToPounds = 2.2046226218;
const formatWeight = (value) => Number(value).toLocaleString("en", { maximumFractionDigits: 1 });
const formatDate = (value) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value;
  return new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" });
};

function TrendChart({ entries, label, emptyMessage }) {
  const recent = entries.slice(0, 8).reverse();
  if (!recent.length) return <p className="progress-empty">{emptyMessage}</p>;

  const values = recent.map((entry) => entry.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * .15, 1);
  const coordinates = recent.map((entry, index) => ({
    x: recent.length === 1 ? 160 : 18 + index * (284 / (recent.length - 1)),
    y: high === low ? 68 : 18 + ((high + padding - entry.value) / (high - low + padding * 2)) * 100,
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coordinates.length > 1
    ? `${coordinates[0].x},128 ${line} ${coordinates.at(-1).x},128`
    : "";

  return (
    <>
      <svg className="progress-chart" viewBox="0 0 320 140" role="img" aria-label={`${label} from ${formatDate(recent[0].date)} to ${formatDate(recent.at(-1).date)}; latest ${formatWeight(recent.at(-1).value)} pounds`}>
        <path className="progress-chart-grid" d="M18 20H302 M18 70H302 M18 120H302" />
        {area && <polygon className="progress-chart-area" points={area} />}
        {coordinates.length > 1 && <polyline className="progress-chart-line" points={line} />}
        {coordinates.map((point, index) => (
          <circle className="progress-chart-point" key={recent[index].id} cx={point.x} cy={point.y} r={index === coordinates.length - 1 ? 5 : 3.5} />
        ))}
      </svg>
      <div className="progress-chart-dates">
        <span>{formatDate(recent[0].date)}</span>
        {recent.length > 1 && <span>{formatDate(recent.at(-1).date)}</span>}
      </div>
    </>
  );
}

function ProgressPage({ state, setState, onLogWeight }) {
  const body = state.progressMode === "Body";
  const strengthHistory = state.strengthHistory || [];
  const selectedLiftKey = state.selectedLiftKey || strengthHistory[0]?.exerciseKey || exerciseOptions[0].key;
  const selectedExercise = exerciseOptions.find((exercise) => exercise.key === selectedLiftKey);
  const selectedLiftHistory = strengthHistory.filter((entry) => entry.exerciseKey === selectedLiftKey);
  const latestLift = selectedLiftHistory[0];
  const bestLift = selectedLiftHistory.reduce((best, entry) =>
    !best || entry.weightKg > best.weightKg ? entry : best, null);
  const weighIns = state.bodyMeasurements
    .filter((item) => Number(item.weight_kg) > 0)
    .map((item) => ({
      id: item.id,
      date: item.measured_at,
      value: Number(item.weight_kg) * kilogramsToPounds,
    }));
  const latestWeight = weighIns[0];
  const previousWeight = weighIns[1];
  const weightChange = latestWeight && previousWeight ? latestWeight.value - previousWeight.value : null;
  const trendEntries = body
    ? weighIns
    : selectedLiftHistory.map((entry) => ({ id: entry.id, date: entry.completedAt, value: entry.weightLb }));

  return (
    <section className="page progress-page">
      <Header eyebrow="Your trends" title="Progress" />

      <div className="progress-tabs" role="group" aria-label="Progress view">
        {[["Lifts", "Strength"], ["Body", "Body weight"]].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={state.progressMode === mode}
            className={`progress-tab${state.progressMode === mode ? " active" : ""}`}
            onClick={() => setState((current) => ({ ...current, progressMode: mode }))}
          >{label}</button>
        ))}
      </div>

      <article className="card progress-card">
        <div className="progress-card-header">
          <h2>{body ? "Body weight" : "Strength"}</h2>
          {body && <button type="button" className="progress-log-button" onClick={onLogWeight}>+ Log weight</button>}
        </div>

        {!body && (
          <label className="progress-lift-field">
            <span className="progress-lift-label">Exercise</span>
            <span className="progress-select-wrap">
              <select value={selectedLiftKey} onChange={(event) => setState((current) => ({ ...current, selectedLiftKey: event.target.value }))}>
                {exerciseOptions.map((exercise) => <option key={exercise.key} value={exercise.key}>{exercise.name}</option>)}
              </select>
            </span>
          </label>
        )}

        <div className="progress-metrics">
          {body ? (
            <>
              <div className="progress-metric">
                <span>Latest weight</span>
                <strong>{latestWeight ? `${formatWeight(latestWeight.value)} lb` : "—"}</strong>
                <small>{latestWeight ? formatDate(latestWeight.date) : "No weigh-ins yet"}</small>
              </div>
              <div className="progress-metric">
                <span>Since last weigh-in</span>
                <strong>{weightChange == null ? "—" : `${weightChange > 0 ? "+" : weightChange < 0 ? "−" : ""}${formatWeight(Math.abs(weightChange))} lb`}</strong>
                <small>{previousWeight ? `Previous: ${formatWeight(previousWeight.value)} lb` : "Log another to compare"}</small>
              </div>
            </>
          ) : (
            <>
              <div className="progress-metric">
                <span>Current best</span>
                <strong>{bestLift ? `${formatWeight(bestLift.weightLb)} lb` : "—"}</strong>
                <small>{bestLift ? `${bestLift.reps} reps · ${formatDate(bestLift.completedAt)}` : "No logged sets yet"}</small>
              </div>
              <div className="progress-metric">
                <span>Last workout</span>
                <strong>{latestLift ? `${formatWeight(latestLift.weightLb)} × ${latestLift.reps}` : "—"}</strong>
                <small>{latestLift ? formatDate(latestLift.completedAt) : "Finish a workout to start"}</small>
              </div>
            </>
          )}
        </div>
        {!body && <p className="progress-note">Current best is the heaviest completed set you have logged for this exercise.</p>}
      </article>

      <article className="card progress-card">
        <div className="progress-card-header">
          <h2>Trend</h2>
          <span>Last {Math.min(trendEntries.length, 8)} {body ? "weigh-ins" : "workouts"}</span>
        </div>
        <TrendChart
          entries={trendEntries}
          label={body ? "Body weight" : `${selectedExercise?.name || "Strength"} heaviest set`}
          emptyMessage={body ? "Log a weigh-in to see your weight trend." : "Complete a workout with weight and reps for this exercise to see its trend."}
        />
      </article>

      <article className="card progress-card">
        <div className="progress-card-header">
          <h2>{body ? "Recent weigh-ins" : "Recent sets"}</h2>
        </div>
        {(body ? weighIns : selectedLiftHistory).length ? (
          <div className="progress-recent-list">
            {(body ? weighIns : selectedLiftHistory).slice(0, 4).map((entry) => (
              <div className="progress-recent-row" key={entry.id}>
                <span>{formatDate(body ? entry.date : entry.completedAt)}</span>
                <div>
                  <strong>{body ? `${formatWeight(entry.value)} lb` : `${formatWeight(entry.weightLb)} lb × ${entry.reps}`}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="progress-empty">{body ? "No weigh-ins recorded yet." : "No completed sets for this exercise yet."}</p>}
      </article>
    </section>
  );
}

export default ProgressPage;
