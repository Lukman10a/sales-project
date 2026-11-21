# Backend

The sales and inventory operations API. Owns the data model and the business rules for auth, sales, inventory, team, notifications, analytics, and profile.

## Language

**Sale**:
A completed transaction recording items sold to a customer. Always priced by the server from the catalogue: subtotal, less discount, plus VAT when the business charges it. Carries a per-business **Receipt number** (`#1218`).
_Avoid_: Purchase, transaction

**Sale line**:
One product on a sale, sold by the `unit` or the `carton` (the product's carton size and carton price). Records how many were sold and how many have since been refunded.
_Avoid_: Order line

**Idempotency key**:
The `Idempotency-Key` header a till sends with each new sale. Within 24 hours, the same key with the same body returns the original sale; with a different body it is refused (422).

**Held sale**:
A sale kept in progress without payment, set aside to be resumed or completed later. Seen only by the person who held it; holds no prices, which are read again on resume.
_Avoid_: Pending sale, draft

**Refund**:
A reversal of a completed sale that returns funds to the customer and puts the stock back. Needs a reason; may cover only some quantities of some lines (a partial refund), never more than was sold.
_Avoid_: Return, void

**Inventory item**:
A stockable product the business sells or tracks: cost price, selling price, optional carton size and carton price, expiry date, reorder point, a barcode unique within the business, and any number of **Categories**. Its `quantity` is never edited directly. (The confirmation workflow, `confirmedByApprentice`, was removed in T36; the audit log records who added or changed a product.)
_Avoid_: Product, stock entry

**Category**:
A named group of inventory items, one row per business and name; an item may be in several.

**Stock movement**:
One append-only line of an inventory item's stock history: a signed `delta`, a reason (`sale`, `refund`, `restock`, `adjustment`, `import`, `void`), what caused it (`refId`, such as the sale id), who, and a note. Every quantity change writes one in the same transaction, so an item's quantity always equals the sum of its movements; a nightly check reports any drift. An **Adjustment** (a count correction, damage, theft) always carries its reason.
_Avoid_: Stock log, inventory transaction

**Import**:
Adding or updating inventory items from a CSV or Excel file (at most 5,000 rows and 5 MB). First a preview reports each row's verdict and writes nothing; the confirm applies the valid rows in one transaction. A row updates the item with the same SKU, else barcode, else name; its quantity is the stock now on hand, recorded as an `import` movement for the difference.

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
