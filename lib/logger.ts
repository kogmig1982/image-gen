import fs from "fs";
import path from "path";

const LOG_DIR  = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "api.log");

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function ts() {
  return new Date().toISOString();
}

export function logInfo(tag: string, message: string) {
  const line = `[${ts()}] [${tag}] ${message}\n`;
  process.stdout.write(line);
  ensureDir();
  fs.appendFileSync(LOG_FILE, line);
}

/** Log an object. Optionally pass a redact list of key names to shorten. */
export function logJson(
  tag: string,
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  redactLongStrings = true
) {
  const copy = JSON.parse(JSON.stringify(obj));
  if (redactLongStrings) shortenLongStrings(copy);

  const body = JSON.stringify(copy, null, 2);
  const line = `[${ts()}] [${tag}] ${label}\n${body}\n`;
  process.stdout.write(line);
  ensureDir();
  fs.appendFileSync(LOG_FILE, line);
}

/** Write the raw string as-is (no truncation) — for full response debugging. */
export function logRaw(tag: string, label: string, text: string) {
  const line = `[${ts()}] [${tag}] ${label}\n${text}\n`;
  process.stdout.write(line);
  ensureDir();
  fs.appendFileSync(LOG_FILE, line);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shortenLongStrings(obj: any) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string" && val.length > 300 && !val.startsWith("http")) {
      // Keep first 80 chars so we can see the type (e.g. "iVBORw0K" = PNG)
      obj[key] = `${val.slice(0, 80)}…<total ${val.length} chars>`;
    } else if (typeof val === "object") {
      shortenLongStrings(val);
    }
  }
}
