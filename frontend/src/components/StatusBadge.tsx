import { Badge } from './primitives';

const COLORS: Record<string, string> = {
  Available: 'var(--color-status-available)',
  'On Trip': 'var(--color-status-ontrip)',
  'In Shop': 'var(--color-status-shop)',
  Retired: 'var(--color-status-retired)',
  'Off Duty': '#8b93a1',
  Suspended: 'var(--color-status-retired)',
  Draft: 'var(--color-status-draft)',
  Dispatched: 'var(--color-status-ontrip)',
  Completed: 'var(--color-status-available)',
  Cancelled: 'var(--color-status-retired)',
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? '#8b93a1';
  return <Badge color={color}>{status}</Badge>;
}
