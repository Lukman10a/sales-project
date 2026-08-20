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
The access level shown to a signed-in member. Login accounts are `owner` or `apprentice`; a separate `staffRole` (`sales-assistant`, `manager`, `checkout`, `inventory`, `investor`) refines the access level for invited team members.
_Avoid_: Role

**Investor**:
An external party who views reports and ROI projections. Invited investors log in through a normal `apprentice` account carrying `staffRole = "investor"` and land on the mock/coming-soon investor pages; the manual "Investor" choice on the login form stays blocked. No Backend investor module exists.
_Avoid_: Partner, stakeholder

**Notification type**:
The kind of notification shown in the UI: `alert`, `ai`, `system`, and others Backend emits. UI must tolerate types it does not model.
_Avoid_: Message kind
