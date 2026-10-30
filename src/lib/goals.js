export function getGoalProgress({ start, current, target }) {
  const direction = target < start ? -1 : 1;
  const distance = Math.abs(target - start);
  const moved = (current - start) * direction;
  const reached = distance === 0 ? moved >= 0 : moved >= distance;
  const percent = distance === 0
    ? (reached ? 100 : 0)
    : Math.max(0, Math.min(100, Math.round((moved / distance) * 100)));
  const remaining = reached ? 0 : Math.max(0, (target - current) * direction);
  return { percent, remaining, reached };
}
