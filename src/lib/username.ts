/**
 * Accounts are addressed by short username in the UI ("hrbata") but Firebase Auth
 * needs an email, so bare usernames map onto the @local.app domain.
 */
export function usernameToEmail(input: string): string {
  const clean = input.trim().toLowerCase();
  return clean.includes('@') ? clean : `${clean}@local.app`;
}
