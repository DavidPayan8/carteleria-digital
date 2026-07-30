type Listener = (lines: readonly string[]) => void;

const MAX_LINES = 50;
const lines: string[] = [];
const listeners = new Set<Listener>();

export function log(message: string): void {
  const stamped = `${new Date().toLocaleTimeString()}  ${message}`;
  lines.push(stamped);
  if (lines.length > MAX_LINES) lines.shift();
  console.log(`[player] ${message}`);
  listeners.forEach((listener) => listener(lines));
}

export function onLog(listener: Listener): () => void {
  listeners.add(listener);
  listener(lines);
  return () => listeners.delete(listener);
}
