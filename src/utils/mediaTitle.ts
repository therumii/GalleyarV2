/**
 * Formats a photo or video title when it is edited.
 * Preserves original media name and appends incrementing suffix " 1", " 2", " 3", etc.
 *
 * Example:
 * - "Sunset Beach" -> "Sunset Beach 1"
 * - "Sunset Beach 1" -> "Sunset Beach 2"
 * - "Sunset Beach (Edited)" -> "Sunset Beach 1"
 */
export function getEditedMediaTitle(currentTitle: string): string {
  if (!currentTitle) return "Media 1";

  // Clean off legacy "(Edited)" or "(Trimmed)" if present
  let clean = currentTitle.replace(/\s*\((Edited|Trimmed)\)/gi, "").trim();

  // Check if title ends with space + digits, e.g., "Sunset 1"
  const match = clean.match(/^(.*?)\s+(\d+)$/);
  if (match) {
    const base = match[1];
    const currentNum = parseInt(match[2], 10);
    return `${base} ${currentNum + 1}`;
  }

  return `${clean} 1`;
}
