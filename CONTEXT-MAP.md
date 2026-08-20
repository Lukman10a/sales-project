# Context Map

## Contexts

- [Backend](./apps/backend/CONTEXT.md) — the sales and inventory operations API; source of truth for the data model
- [Web](./apps/web/CONTEXT.md) — the product UI over the Backend API

## Relationships

- **Web → Backend**: Web consumes Backend's HTTP API (direct at `:4000`, no `/api` prefix). Backend is the contract of truth — Web adapts to Backend's shapes, never the reverse.
- **Web ↔ Backend**: Shared domain vocabulary (sale, held sale, refund, staff role, permission, inventory item). Known disagreements between the two contexts' vocabulary are recorded in each context's glossary.
