import { useState } from "react";
import Header from "./Header.jsx";

function AuthGate({ onSignIn, onRegister, error, busy }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === "signin") onSignIn({ email, password });
    else onRegister({ email, password });
  }

  return (
    <section className="page">
      <Header eyebrow="Your personal training space" title={mode === "signin" ? "Welcome back" : "Create account"} />
      <form className="card auth-card" onSubmit={handleSubmit}>
        <label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field">Password<input type="password" minLength="6" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        <p className="auth-hint">{mode === "signin" ? "New to Surge?" : "Already have an account?"} <button type="button" className="auth-switch" onClick={() => setMode((current) => current === "signin" ? "register" : "signin")}>{mode === "signin" ? "Create one" : "Sign in"}</button></p>
      </form>
    </section>
  );
}

export default AuthGate;
