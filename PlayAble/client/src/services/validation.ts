export function validateSearchTerm(searchTerm: string): string | undefined {
  const trimmed = searchTerm.trim();
  const isValid = /^[a-zA-Z\-\s]{1,50}$/.test(trimmed);
  return isValid ? trimmed : undefined;
}
