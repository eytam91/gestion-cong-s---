import { describe, expect, it } from 'vitest';
import { usernameToEmail } from '@/lib/username';

describe('usernameToEmail', () => {
  it('maps a bare username onto the local domain', () => {
    expect(usernameToEmail('hrbata')).toBe('hrbata@local.app');
  });

  it('normalises case and surrounding whitespace', () => {
    expect(usernameToEmail('  HRbata  ')).toBe('hrbata@local.app');
  });

  it('leaves a real email address alone', () => {
    expect(usernameToEmail('Jean.Dupont@example.com')).toBe('jean.dupont@example.com');
  });
});
