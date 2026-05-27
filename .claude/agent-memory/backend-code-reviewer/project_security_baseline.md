---
name: project-security-baseline
description: Known security issues and baseline security decisions across auth, webhook, and properties
metadata:
  type: project
---

## Auth layer
- Admin credentials are stored in `application.properties` in plaintext (`app.admin.email=csmai@gmail.com`, `app.admin.password=csmai123`). Short/weak password. Critical recurring issue.
- The `/api/auth/**` route pattern is fully `permitAll()` in SecurityConfig — intentional for login, but any future `/api/auth/*` endpoint added is automatically public without a conscious decision.
- Session fixation protection is not explicitly configured; Spring Boot default may cover it but not confirmed in SecurityConfig.
- No rate limiting exists on `/api/auth/login` or `/api/webhook/email`.

## Webhook endpoint (/api/webhook/email)
- Intentionally public (no auth) — SendGrid calls it directly. Documented in code.
- No SendGrid webhook signature verification — any caller can forge tickets by POSTing to this endpoint. Flag as HIGH risk.
- Always returns 200 OK to avoid SendGrid duplicate-retry behavior — correct and documented.

## application.properties committed secrets (CRITICAL)
- `spring.datasource.password=8121` — real DB password committed to source.
- `app.admin.password=csmai123` — admin password committed to source.
- `spring.ai.anthropic.api-key=your_anthropic_api_key` — placeholder value only, but the pattern is risky.

**Why:** Flagged during auth review and again during ticket management feature review (2026-05-23).
**How to apply:** Always flag any addition of credentials/secrets to application.properties as CRITICAL. Recommend environment variable overrides or a secrets manager before any production deployment.
