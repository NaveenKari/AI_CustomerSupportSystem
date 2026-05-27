---
name: project-ticket-management
description: Architecture patterns, known issues, and technical debt in the ticket management feature
metadata:
  type: project
---

## Overview (added 2026-05-23)
Ticket management is the first real domain feature beyond auth. Uses Spring Data JPA with PostgreSQL. No explicit Flyway/Liquibase migrations — relies on `spring.jpa.hibernate.ddl-auto=update` (risky for production).

## Key patterns observed
- `TicketService` is class-level `@Transactional` with method-level `readOnly=true` overrides — correct pattern.
- DTOs are Java records with Bean Validation annotations — good. But `CreateTicketRequest` is also used by the webhook controller, which bypasses `@Valid` (webhook receives raw params, not a `@RequestBody`).
- `toDetail()` accesses `ticket.getMessages()` (LAZY collection) — safe only because it is called within the transaction. If ever called outside a transaction (e.g., from a non-transactional context), it will throw `LazyInitializationException`.
- `TicketMessageRepository.findByTicketIdOrderBySentAtAsc` exists but is never used — dead code.
- `getAllTickets` returns all matching tickets as a `List` — no pagination. Will become a performance problem at scale.

## Known technical debt
- No Flyway/Liquibase — schema managed by `ddl-auto=update`.
- No database indexes on `tickets.status`, `tickets.category`, `tickets.created_at` — filter queries will full-scan.
- Missing `@Column` length constraints on `subject`, `customerEmail`, `customerName` — unbounded VARCHAR in PostgreSQL.
- Webhook endpoint has no SendGrid signature verification (see [[project-security-baseline]]).
- `keyword` search pattern is `%keyword%` — leading wildcard prevents index use, full table scan on every search.

**Why:** Captured during first ticket management review (2026-05-23).
**How to apply:** When reviewing future ticket or webhook features, check that pagination is added, indexes are referenced, and the lazy-load-within-transaction pattern is preserved.
