import { useEffect } from "react";
import "./WorkoutCelebration.css";

const colors = ["#fff", "#ffe6de", "#f4b8ad", "#f5d48c"];
const confetti = Array.from({ length: 84 }, (_, index) => ({
  left: `${(index * 37 + (index % 3) * 9) % 100}%`,
  delay: `${(index % 6) * 75}ms`,
  duration: `${1450 + (index % 5) * 140}ms`,
  drift: `${((index % 7) - 3) * 22}px`,
  spin: `${(index % 2 ? -1 : 1) * (360 + (index % 4) * 90)}deg`,
  color: colors[index % colors.length],
  width: `${5 + (index % 3) * 2}px`,
  height: `${8 + (index % 4) * 2}px`,
}));

function WorkoutCelebration() {
  useEffect(() => {
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const previousColor = themeColor?.getAttribute("content");
    themeColor?.setAttribute("content", "#9e2921");
    return () => {
      if (previousColor != null) themeColor?.setAttribute("content", previousColor);
    };
  }, []);

  return (
    <div className="workout-celebration" role="status" aria-live="polite">
      <div className="celebration-confetti" aria-hidden="true">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className="confetti-piece"
            style={{
              "--left": piece.left,
              "--delay": piece.delay,
              "--duration": piece.duration,
              "--drift": piece.drift,
              "--spin": piece.spin,
              "--color": piece.color,
              "--width": piece.width,
              "--height": piece.height,
            }}
          />
        ))}
      </div>
      <div className="celebration-content">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" />
          <path d="M15 14a5 5 0 0 0-7.584 2" />
          <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" />
        </svg>
        <p>Workout complete</p>
      </div>
    </div>
  );
}

export default WorkoutCelebration;
