export const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear}y ago`;
  if (diffMonth > 0) return `${diffMonth}mo ago`;
  if (diffWeek > 0) return `${diffWeek}w ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
};
