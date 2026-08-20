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
The access level granted to a team member. Login accounts are canonical `owner`, `manager`, `apprentice`; a separate `staffRole` column on the user record refines team accounts (`sales-assistant`, `manager`, `checkout`, `inventory`, `investor`). Team roles map to a login account: `manager` → `manager`, everything else → `apprentice` with `staffRole` carrying the team role. Kept in sync when a member's role changes.
_Avoid_: Role, permission (see Permission)

**Permission**:
A granular capability granted to a role. Canonical set: `view-products`, `edit-products`, `delete-products`, `view-sales-history`, `record-sales`, `view-inventory`, `edit-inventory`, `assign-roles`, `view-reports`.
_Avoid_: Access right, privilege

**Team member**:
A person granted access to the business through an invitation.
_Avoid_: Staff, user

**Owner**:
The person who registers the business and holds full access. Registration always creates an owner.
_Avoid_: Admin, superuser

**Contract of truth**:
The API contracts defined here that the Web context must conform to.
_Avoid_: Schema, spec
