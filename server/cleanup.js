import db from "./db.js";

export const RETENTION_OPTION = [
  { label: "Never", hours: 0 },
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

const INTERVAL_MS = 15 * 60 * 1000;

export async function runCleanup() {
  try {
    const result = await db.query(
      `delete from chat_message
      where id in (
      select cm.id
      from chat_message cm
      join chat_room cr on cr.id = cm.room_id
      where cr.rentention_hours > 0
      and cm.created_at < now() - (cr.retention_hours * interval '1 hour')
      )`
    );
    if (result.rowCount > 0)
    {
      console.log(`[cleanup] Deleted ${result.rowCount} expired chat message(s).`);
      }
  }
}
