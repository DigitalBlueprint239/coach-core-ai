"use strict";
/**
 * Privacy minimization for youth-athlete data (Day 1 finding F-09).
 *
 * The contract (schemas.js) has no fields for names, rosters, contact data
 * or dates of birth. Coaches can still type identifying details into free
 * text, so every string that leaves the server passes through redactText().
 * This is a best-effort filter, not a guarantee; the UI must also tell
 * coaches not to enter player names or personal details.
 */

const PATTERNS = [
  // email addresses
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]"],
  // URLs
  [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[link removed]"],
  // social handles
  [/(^|\s)@[A-Za-z0-9_.]{2,}/g, "$1[handle removed]"],
  // dates such as 03/14/2012, 2012-03-14, 3-14-12
  [/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[date removed]"],
  // phone numbers (7+ digits with common separators)
  [/(\+?\d[\d\s().-]{6,}\d)/g, "[number removed]"],
];

/**
 * Remove likely personal identifiers from free text.
 * @param {string} text
 * @return {string}
 */
function redactText(text) {
  let out = String(text);
  for (const [re, replacement] of PATTERNS) out = out.replace(re, replacement);
  return out;
}

/**
 * Deep-copy a validated input object, redacting every string value.
 * @param {*} value
 * @return {*}
 */
function redactDeep(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, redactDeep(v)]),
    );
  }
  return value;
}

module.exports = {redactText, redactDeep};
