export async function logPrint(
  entity: string,
  entityId: number | null,
  entityLabel: string,
  description: string
): Promise<void> {
  try {
    await fetch('/api/activity-log', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'print', entity, entityId, entityLabel, description })
    });
  } catch {
    // fire and forget — never throw
  }
}
