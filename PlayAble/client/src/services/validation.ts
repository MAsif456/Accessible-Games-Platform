/**
 * Validate a search term.
 * Trims the input string and checks if it contains only letters, hyphens, and whitespace characters.
 * The length of the trimmed string must be between 1 and 50 characters (inclusive).
 * If the input is valid, return the trimmed string. Otherwise, return undefined.
 * @param searchTerm - The input search term to validate.
 * @returns The validated search term, or undefined if it's invalid.
 */
export function validateSearchTerm(searchTerm: string): string | undefined {
  const trimmed = searchTerm.trim();
  const isValid = /^[a-zA-Z\-\s]{1,50}$/.test(trimmed);
  return isValid ? trimmed : undefined;
}
