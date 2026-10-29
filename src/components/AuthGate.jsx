import { useState } from "react";
import Header from "./Header.jsx";

const APP_PASSCODE = import.meta.env.VITE_PASSCODE;

function AuthGate({ onSubmit, error, busy }) {
  const [passcode, setPasscode] = useState("");
  const [localError, setLocalError] = useState("");
  const configured = Boolean(APP_PASSCODE);

  function handleSubmit(event) {
    event.preventDefault();
    if (passcode !== APP_PASSCODE) {
      setLocalError("Incorrect passcode.");
      return;
    }
    setLocalError("");
    onSubmit();
  }

  return (
    <section className="page">
      <Header title="Enter passcode" />
      <form className="card auth-card" onSubmit={handleSubmit}>
        {!configured && <p className="form-error">Set VITE_PASSCODE in your environment to enable the passcode gate.</p>}
        <label className="field">Passcode<input type="password" inputMode="numeric" autoComplete="current-password" value={passcode} onChange={(event) => { setPasscode(event.target.value); setLocalError(""); }} autoFocus required /></label>
        {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
        <button className="button full" disabled={busy || !configured}>{busy ? "Checking…" : "Unlock"}</button>
      </form>
    </section>
  );
}

export default AuthGate;
