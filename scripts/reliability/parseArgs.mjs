export function parseArgs(argv) {
  const out = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eqIndex = arg.indexOf("=", 2);
    if (eqIndex === -1) {
      out.set(arg.slice(2), "true");
    } else {
      out.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
    }
  }
  return out;
}
