# Backend

The sales and inventory operations API. Owns the data model and the business rules for auth, sales, inventory, team, notifications, analytics, and profile.

## Language

**Sale**:
A completed transaction recording items sold to a customer.
_Avoid_: Purchase, transaction

**Held sale**:
A sale kept in progress without payment, set aside to be resumed or completed later.
_Avoid_: Pending sale, draft

**Refund**:
A reversal of a completed sale that returns funds to the customer.
_Avoid_: Return, void

**Inventory item**:
A stockable product the business sells or tracks.
_Avoid_: Product, stock entry

**Staff role**:
The role a team member holds: `manager` or `cashier`. With `owner`, these are the only login roles; a member's login role is kept equal to their team role. A role sets a member's starting permissions (its preset); the owner can then change them switch by switch.
_Avoid_: Apprentice, staffRole (both removed in T33), permission (see Permission)

**Permission**:
A capability held by a team member, stored on their team-member row; owners hold all of them. Canonical set: `sales.record`, `sales.discount`, `sales.refund`, `products.edit_price`, `products.restock`, `products.delete`, `reports.view_profit`, `staff.manage`, `billing.manage`, `settings.manage`. Presets: manager = record, discount, refund, restock (10% discount cap); cashier = record (no discount). Viewing products and stock needs only membership. Checked per request from the database, never from the token, so a change applies on the next request.
_Avoid_: Access right, privilege

**Discount cap**:
`maxDiscountPercent` on a team member: the largest discount they may give, and only with `sales.discount`. Owners are uncapped.
_Avoid_: Discount limit

**Tenant**:
A business, identified by `businessId` (the owner's user id). Every repository holding business data takes `businessId` as its first argument; a record of another tenant is reported as not found.
_Avoid_: Organisation, account

**Audit event**:
An append-only record of one action in a business: who (actor, session, ip), what (`action`, entity), and the before/after values with secrets redacted. Written in the same transaction as the change it describes; the database refuses to update or delete it. The team activity feed is a reading of these.
_Avoid_: Log entry, activity record

**Team member**:
A person granted access to the business through an invitation.
_Avoid_: Staff, user

**Owner**:
The person who registers the business and holds full access. Registration always creates an owner.
_Avoid_: Admin, superuser

**Contract of truth**:
The API contracts defined here that the Web context must conform to.
_Avoid_: Schema, spec
