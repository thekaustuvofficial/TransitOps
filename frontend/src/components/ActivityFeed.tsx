import { Radio } from 'lucide-react';
import { useDb } from '../hooks/useDb';
import { timeAgo } from '../lib/format';
import { ROLE_INITIALS, ROLE_LABEL } from '../lib/permissions';
import { Card } from './primitives';

const ACTION_DOT: Record<string, string> = {
  'vehicle.created': 'bg-emerald-500',
  'vehicle.updated': 'bg-teal-500',
  'driver.created': 'bg-sky-500',
  'driver.updated': 'bg-blue-500',
  'trip.created': 'bg-gray-400',
  'trip.dispatched': 'bg-amber-500',
  'trip.completed': 'bg-emerald-500',
  'trip.cancelled': 'bg-red-500',
  'maintenance.opened': 'bg-orange-500',
  'maintenance.closed': 'bg-emerald-500',
  'fuel.logged': 'bg-violet-500',
  'expense.logged': 'bg-purple-500',
};

export function ActivityFeed() {
  const db = useDb();
  const activities = db.activity;

  return (
    <Card className="flex h-full flex-col overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="pulse-dot text-amber-500" size={16} />
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
            Live Activity Feed
          </h3>
        </div>
        <span className="text-[10px] font-medium text-[var(--color-text-faint)]">
          {activities.length} entries
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--color-text-faint)]">No activity logs recorded yet.</p>
        ) : (
          activities.map((act) => {
            const dotColor = ACTION_DOT[act.action] ?? 'bg-amber-500';
            const initials = ROLE_INITIALS[act.role] ?? '??';
            const roleLabel = ROLE_LABEL[act.role] ?? act.role;

            return (
              <div key={act.id} className="relative flex items-start gap-3 text-xs leading-normal">
                {/* Timeline dot */}
                <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-[var(--color-border-soft)]">
                  <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      {act.actor}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-faint)] shrink-0">
                      {timeAgo(act.timestamp)}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-muted)]">{act.detail}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="font-display rounded bg-[var(--color-panel-2)] px-1 py-0.5 text-[9px] font-semibold text-amber-500 border border-[var(--color-border)]">
                      {initials}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-faint)]">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
