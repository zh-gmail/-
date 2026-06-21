// crypto.randomUUID() with console fallback for non-secure contexts
export function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch (_err) {
    // crypto.randomUUID() throws in non-secure contexts (e.g. localhost HTTP)
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
