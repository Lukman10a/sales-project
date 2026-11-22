import { InviteMemberDtoSchema } from './invite-member.dto';

describe('InviteMemberDtoSchema', () => {
  it('accepts the staff roles with canonical permissions', () => {
    const parsed = InviteMemberDtoSchema.parse({
      email: 'kelechi@shop.ng',
      name: 'Kelechi Musa',
      role: 'cashier',
      permissions: ['sales.record'],
      maxDiscountPercent: 5,
    });
    expect(parsed.role).toBe('cashier');
  });

  it.each(['superuser', 'owner', 'investor', 'sales-assistant'])(
    'rejects the role %s',
    (role) => {
      expect(() =>
        InviteMemberDtoSchema.parse({
          email: 'a@b.com',
          name: 'Jane Doe',
          role,
        }),
      ).toThrow();
    },
  );

  it('rejects legacy permission names', () => {
    expect(() =>
      InviteMemberDtoSchema.parse({
        email: 'a@b.com',
        name: 'Jane Doe',
        role: 'cashier',
        permissions: ['record-sales'],
      }),
    ).toThrow();
  });
});
