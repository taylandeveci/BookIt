import wordsData from './blockedWords.json';

const terms: string[] = (wordsData as { terms: string[] }).terms;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();

  // Check 1 — direct substring match
  for (const word of terms) {
    if (normalized.includes(word.toLowerCase())) return true;
  }

  // Check 2 — separator removal: strip non-letter/digit characters then check
  const cleaned = normalized.replace(/[^a-z0-9ğüşıöç]/g, '');
  for (const word of terms) {
    const wordCleaned = word.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
    if (wordCleaned.length >= 2 && cleaned.includes(wordCleaned)) return true;
  }

  // Check 3 — digit substitution: 0→o, 1→i, 3→e, 4→a, 5→s
  const substituted = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's');
  for (const word of terms) {
    if (substituted.includes(word.toLowerCase())) return true;
  }

  // Check 4 — regex pattern: allow any non-letter/digit separator between each letter
  for (const word of terms) {
    const wordLower = word.toLowerCase().trim();
    if (!wordLower) continue;
    const pattern = wordLower.split('').map(escapeRegex).join('[^a-z0-9]*');
    try {
      if (new RegExp(pattern).test(normalized)) return true;
    } catch {
      // skip malformed patterns
    }
  }

  return false;
}
