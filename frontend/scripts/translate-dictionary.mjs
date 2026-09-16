#!/usr/bin/env node
/**
 * Seeds a translation file from the English dictionary using Google Cloud
 * Translation, so machine output can be compared against what a person wrote
 * rather than replacing it.
 *
 * It never writes over a dictionary the site loads. The default output is
 * ur.machine.json, which is meant to be diffed against ur.json — keep whichever
 * reading is better, string by string.
 *
 *   GOOGLE_TRANSLATE_API_KEY=... node scripts/translate-dictionary.mjs
 *   node scripts/translate-dictionary.mjs --locale ur --out ur.machine.json
 *   node scripts/translate-dictionary.mjs --dry-run
 *
 * The key is read from the environment and never logged, echoed or written to
 * any file. Supply it on the command line for a single run rather than storing
 * it in the repository.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dictionaries = path.join(here, "..", "src", "lib", "i18n", "dictionaries");

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const locale = option("locale", "ur");
const outputName = option("out", `${locale}.machine.json`);
const dryRun = process.argv.includes("--dry-run");
const endpoint = "https://translation.googleapis.com/language/translate/v2";
/** The v2 API accepts up to 128 segments per call. */
const batchSize = 100;

const source = JSON.parse(readFileSync(path.join(dictionaries, "en.json"), "utf8"));

/**
 * Every translatable string, remembering where in the tree it belongs. Strings
 * with no words of their own — separators, numbers, an email address, anything
 * that is only {placeholders} — are left exactly as they are.
 */
const segments = [];

/** Rebuilds the tree, gathering segments as it goes. */
function walk(value, place) {
  if (typeof value === "string") {
    const words = value.replace(/\{\w+\}/gu, "");
    const isAddress = /^[\w.+-]+@[\w.-]+$/u.test(value.trim());
    if (/\p{L}/u.test(words) && !isAddress) segments.push({ text: value, place });
    return value;
  }
  if (Array.isArray(value)) {
    const copy = value.map(item => item);
    value.forEach((item, index) => {
      copy[index] = walk(item, next => { copy[index] = next; });
    });
    return copy;
  }
  if (value && typeof value === "object") {
    const copy = {};
    for (const [key, item] of Object.entries(value)) {
      copy[key] = walk(item, next => { copy[key] = next; });
    }
    return copy;
  }
  return value;
}

const target = walk(source, () => {});

/*
  Google translates the words inside {braces} too, which breaks every message
  that interpolates a name or a number. Marking them as untranslatable requires
  HTML mode, so the text is sent as HTML with each placeholder wrapped, and
  unwrapped again on the way back.
*/
const protect = text => text.replace(/\{(\w+)\}/gu, '<span translate="no">{$1}</span>');
const unprotect = text =>
  text
    .replace(/<span translate="no">\s*\{\s*(\w+)\s*\}\s*<\/span>/giu, "{$1}")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&nbsp;/gu, " ");

console.log(`${segments.length} strings to translate into "${locale}".`);

if (dryRun) {
  console.log("Dry run: nothing was sent and nothing was written.");
  for (const { text } of segments.slice(0, 5)) console.log(`  · ${text}`);
  process.exit(0);
}

const key = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!key) {
  console.error(
    "Set GOOGLE_TRANSLATE_API_KEY to a Cloud Translation API key and run again.\n" +
      "Use --dry-run to see what would be sent without a key.",
  );
  process.exit(1);
}

for (let start = 0; start < segments.length; start += batchSize) {
  const batch = segments.slice(start, start + batchSize);
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: batch.map(segment => protect(segment.text)),
      source: "en",
      target: locale,
      format: "html",
    }),
  });

  if (!response.ok) {
    // The URL carries the key, so report the status and Google's message only.
    const detail = await response.json().catch(() => null);
    console.error(`Translation failed: ${response.status} ${detail?.error?.message ?? response.statusText}`);
    process.exit(1);
  }

  const { data } = await response.json();
  data.translations.forEach((translation, index) => {
    batch[index].place(unprotect(translation.translatedText));
  });
  console.log(`  ${Math.min(start + batch.length, segments.length)}/${segments.length}`);
}

const output = path.join(dictionaries, outputName);
writeFileSync(output, `${JSON.stringify(target, null, 2)}\n`, "utf8");
console.log(`\nWrote ${path.relative(process.cwd(), output)}.`);
console.log(`Compare it with ${locale}.json and keep whichever reading is better:`);
console.log(`  git diff --no-index src/lib/i18n/dictionaries/${locale}.json src/lib/i18n/dictionaries/${outputName}`);
