# Web

The product UI over the Backend API. Renders sales, inventory, team, notifications, analytics, and investor screens for staff roles.

## Language

**Sale record**:
A completed sale rendered in the UI. May include item names and totals computed client-side.
_Avoid_: Sale

**Held transaction**:
A sale kept in progress without payment, shown in the sales workspace until resumed or cancelled.
_Avoid_: Pending sale, draft

**Permission**:
A granular capability a staff role may exercise. UI unions use aliases that Backend does not accept; write-guards translate them before sending. Canonical spellings live in Backend's glossary.
_Avoid_: `checkout-sales`, `view-out-of-stock` (deprecated aliases)

**Staff role**:
The access level shown to a signed-in member. `owner`, `manager`, `apprentice`.
_Avoid_: Role

**Investor**:
An external party who views reports and ROI projections. Fully mock — no Backend module exists; investor login is blocked with a "coming soon" message.
_Avoid_: Partner, stakeholder

**Notification type**:
The kind of notification shown in the UI: `alert`, `ai`, `system`, and others Backend emits. UI must tolerate types it does not model.
_Avoid_: Message kind
