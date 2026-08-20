import { InviteMemberDtoSchema } from './invite-member.dto';

describe('InviteMemberDtoSchema', () => {
  it('accepts the canonical team roles including investor', () => {
    const parsed = InviteMemberDtoSchema.parse({
      email: 'investor@luxa.com',
      name: 'Ada Investor',
      role: 'investor',
      permissions: [],
    });

    expect(parsed.role).toBe('investor');
  });

  it('rejects roles outside the canonical set', () => {
    expect(() =>
      InviteMemberDtoSchema.parse({
        email: 'a@b.com',
        name: 'Jane Doe',
        role: 'superuser',
      }),
    ).toThrow();
  });
});
