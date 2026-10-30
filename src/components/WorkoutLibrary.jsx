import { useState } from "react";
import "./WorkoutLibrary.css";

const blankExercise = () => ({ key: "", name: "", sets: 3, repMin: 8, repMax: 12, rest: 90 });
const blankWorkout = () => ({ name: "New workout", description: "", exercises: [blankExercise()] });

function WorkoutEditor({ workout, onChange, onSave, onDelete, busy }) {
  const changeExercise = (index, field, value) => onChange({ ...workout, exercises: workout.exercises.map((exercise, exerciseIndex) => exerciseIndex === index ? { ...exercise, [field]: value } : exercise) });
  return <div className="workout-editor">
    <label className="field">Workout name<input value={workout.name} onChange={(event) => onChange({ ...workout, name: event.target.value })} required /></label>
    <label className="field">Description <span className="library-optional">(optional)</span><input value={workout.description || ""} onChange={(event) => onChange({ ...workout, description: event.target.value })} placeholder="e.g. Chest and shoulders" /></label>
    <div className="library-exercises"><h3>Exercises</h3>{workout.exercises.map((exercise, index) => <div className="library-exercise" key={index}>
      <div className="library-exercise-top"><strong>Exercise {index + 1}</strong>{workout.exercises.length > 1 && <button type="button" onClick={() => onChange({ ...workout, exercises: workout.exercises.filter((_, exerciseIndex) => exerciseIndex !== index) })}>Remove</button>}</div>
      <input aria-label={`Exercise ${index + 1} name`} value={exercise.name} onChange={(event) => changeExercise(index, "name", event.target.value)} placeholder="Exercise name" required />
      <div className="library-numbers"><label>Sets<input type="number" min="1" value={exercise.sets} onChange={(event) => changeExercise(index, "sets", event.target.value)} /></label><label>Min reps<input type="number" min="1" value={exercise.repMin} onChange={(event) => changeExercise(index, "repMin", event.target.value)} /></label><label>Max reps<input type="number" min="1" value={exercise.repMax} onChange={(event) => changeExercise(index, "repMax", event.target.value)} /></label></div>
      <label className="library-rest">Rest (seconds)<input type="number" min="0" step="15" value={exercise.rest} onChange={(event) => changeExercise(index, "rest", event.target.value)} /></label>
    </div>)}</div>
    <button type="button" className="library-add-exercise" onClick={() => onChange({ ...workout, exercises: [...workout.exercises, blankExercise()] })}>+ Add exercise</button>
    <div className="library-actions"><button type="button" className="button outline" disabled={busy || !workout.id} onClick={onDelete}>Delete</button><button type="button" className="button" disabled={busy} onClick={onSave}>Save workout</button></div>
  </div>;
}

function WorkoutLibrary({ templates, onSave, onDelete, onClose, busy }) {
  const [selected, setSelected] = useState(templates[0] || blankWorkout());
  const choose = (template) => setSelected(template || blankWorkout());
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><section className="modal workout-library" aria-label="Edit workouts">
    <div className="library-header"><div><h2>Workout library</h2></div><button type="button" className="library-close" aria-label="Close" onClick={onClose}>×</button></div>
    <div className="library-tabs">{templates.map((template) => <button type="button" key={template.id} className={selected.id === template.id ? "active" : ""} onClick={() => choose(template)}>{template.name}</button>)}<button type="button" onClick={() => choose(null)}>+ New</button></div>
    <WorkoutEditor workout={selected} onChange={setSelected} onSave={() => onSave(selected)} onDelete={() => onDelete(selected)} busy={busy} />
  </section></div>;
}

export default WorkoutLibrary;
