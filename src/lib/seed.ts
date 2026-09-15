/** Known demo records from the old sample set. These are stripped on load. */
export const SAMPLE_EMAILS = new Set([
  "admin@gppharmacy.edu",
  "staff@gppharmacy.edu",
  "student@gppharmacy.edu",
  "parent@gppharmacy.edu",
]);

export const SAMPLE_IDS = new Set([
  "d1", "d2", "d3", "d4", "d5",
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8",
  "s1", "s2", "s3", "s4", "s5",
  "t1", "t2", "t3", "t4", "t5", "t6",
  "st1", "st2", "st3", "st4", "st5", "st6", "st7", "st8", "st9",
  "u1", "u2", "u3", "u4",
  "e1", "e2", "e3",
  "fp1", "fp2", "fp3", "fp4",
  "n1", "n2", "msg1", "msg2",
  "r1", "r2",
  "b1", "b2", "b3", "b4", "b5",
  "ch1", "ch2", "ch3", "a0",
]);

export function isSampleId(id: string) {
  if (SAMPLE_IDS.has(id)) return true;
  if (id.startsWith("tt-") && id.includes("-s1")) return true;
  if (id.startsWith("att-st")) return true;
  if (id.startsWith("m-st")) return true;
  if (id.startsWith("f-st")) return true;
  return false;
}

export function isSampleRecord(row: { id: string; email?: string }) {
  if (isSampleId(row.id)) return true;
  // Only drop the old demo emails when they still sit on the old demo ids.
  if (row.email && SAMPLE_EMAILS.has(row.email.toLowerCase()) && isSampleId(row.id)) return true;
  return false;
}
