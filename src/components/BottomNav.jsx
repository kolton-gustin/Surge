import dumbellIcon from "../assets/dumbell.svg";

const tabs = [
  { key: "today", label: "Today" },
  { key: "progress", label: "Progress" },
  { key: "goals", label: "Goals" },
];

function NavIcon({ name }) {
  if (name === "today") {
    return <img src={dumbellIcon} alt="" aria-hidden="true" />;
  }
  if (name === "progress") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16M5 16l4-4 3 2 6-7" /><path d="M15 7h3v3" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

function BottomNav({ page, onNavigate }) {
  const activeTab = tabs.some((tab) => tab.key === page) ? page : "today";

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <span className={`nav-indicator is-${activeTab}`} aria-hidden="true" />
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`nav-button ${activeTab === key ? "active" : ""}`}
          aria-current={activeTab === key ? "page" : undefined}
          onClick={() => onNavigate(key)}
        >
          <NavIcon name={key} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
