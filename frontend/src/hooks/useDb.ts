import { useEffect, useState } from 'react';
import { db } from '../lib/db';

/** Re-renders the calling component whenever the db mutates. */
export function useDb() {
  const [, tick] = useState(0);
  useEffect(() => db.subscribe(() => tick((n) => n + 1)), []);
  return db;
}
