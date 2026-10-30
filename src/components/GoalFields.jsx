import { useState } from "react";
import { workoutTemplates } from "../data/workouts.js";
import "./GoalFields.css";

const exercises = workoutTemplates.flatMap((template) => template.exercises)
  .filter((exercise, index, all) => all.findIndex((item) => item.key === exercise.key) === index);

function suggestedStart(type, exerciseKey, state) {
  if (type === "weekly_workouts") return "0";
  if (type === "body_weight") {
    const latest = Number(state.bodyMeasurements[0]?.weight_kg);
    return latest > 0 ? String(Math.round(latest * 2.2046226218 * 10) / 10) : "";
  }
  const best = (state.strengthHistory || [])
    .filter((entry) => entry.exerciseKey === exerciseKey)
    .reduce((max, entry) => Math.max(max, entry.weightLb), 0);
  return best > 0 ? String(best) : "";
}

function GoalFields({ state }) {
  const [type, setType] = useState("estimated_1rm");
  const [exerciseKey, setExerciseKey] = useState(state.strengthHistory[0]?.exerciseKey || exercises[0].key);
  const [start, setStart] = useState(() => suggestedStart("estimated_1rm", exerciseKey, state));
  const weekly = type === "weekly_workouts";
  const lift = type === "estimated_1rm";

  return (
    <div className="goal-fields">
      <label className="field">
        Goal type
        <span className="goal-select-wrap">
          <select name="type" value={type} onChange={(event) => {
            const nextType = event.target.value;
            setType(nextType);
            setStart(suggestedStart(nextType, exerciseKey, state));
          }}>
            <option value="estimated_1rm">Strength</option>
            <option value="body_weight">Body weight</option>
            <option value="weekly_workouts">Weekly workouts</option>
          </select>
        </span>
      </label>
      <label className="field">
        Goal name
        <input name="name" placeholder={lift ? "e.g. Bench press goal" : weekly ? "e.g. Four workouts a week" : "e.g. Target weight"} required />
      </label>
      {lift && (
        <label className="field">
          Exercise
          <span className="goal-select-wrap">
            <select name="exerciseKey" value={exerciseKey} onChange={(event) => {
              setExerciseKey(event.target.value);
              setStart(suggestedStart(type, event.target.value, state));
            }} required>
              {exercises.map((exercise) => <option value={exercise.key} key={exercise.key}>{exercise.name}</option>)}
            </select>
          </span>
        </label>
      )}
      {weekly ? <input type="hidden" name="start" value="0" /> : (
        <label className="field">
          {lift ? "Starting best set (lb)" : "Starting weight (lb)"}
          <input name="start" type="number" min={lift ? "0" : "0.1"} step="0.1" inputMode="decimal" value={start} onChange={(event) => setStart(event.target.value)} placeholder="Enter a starting value" required />
        </label>
      )}
      <label className="field">
        {weekly ? "Workouts per week" : lift ? "Target set weight (lb)" : "Target weight (lb)"}
        <input key={type} name="target" type="number" min={weekly ? "1" : "0.1"} step={weekly ? "1" : "0.1"} inputMode="decimal" placeholder={weekly ? "e.g. 4" : "Enter your target"} required />
      </label>
      {!weekly && <label className="field">Target date (optional)<input name="due" type="date" /></label>}
      <p className="goal-fields-hint">
        {weekly ? "Counts completed workouts from Monday through Sunday." : lift ? "Progress uses the heaviest weight you have completed for this exercise." : "Progress follows your latest logged weigh-in."}
      </p>
    </div>
  );
}

export default GoalFields;
