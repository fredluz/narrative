import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

type DateStyle = 'default' | 'deadline' | 'compact';

export function formatDateTime(isoDateString: string | null, style: DateStyle = 'default'): string {
  if (!isoDateString) return style === 'deadline' ? '' : 'No date set';
  
  const date = parseISO(isoDateString);
  const now = new Date();
  
  // Handle invalid dates
  if (isNaN(date.getTime())) return style === 'deadline' ? '' : 'Invalid date';

  // Get relative time string
  const distanceString = formatDistanceToNow(date, { addSuffix: true });

  // Deadline style just prepends "Due" to the distance
  if (style === 'deadline') {
    return `Due ${distanceString}`;
  }

  // For dates within next/past 24 hours
  if (isToday(date)) {
    return style === 'compact' 
      ? format(date, 'h:mm a')
      : `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return style === 'compact'
      ? `Tom ${format(date, 'h:mm a')}`
      : `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return style === 'compact'
      ? `Yest ${format(date, 'h:mm a')}`
      : `Yesterday at ${format(date, 'h:mm a')}`;
  }

  // For dates within the next/past 7 days
  if (Math.abs(date.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000) {
    return style === 'compact'
      ? format(date, 'MMM d')
      : `${distanceString} (${format(date, 'MMM d, h:mm a')})`;
  }

  // For dates further away
  return style === 'compact'
    ? format(date, 'MMM d')
    : format(date, 'MMM d, yyyy h:mm a');
}
