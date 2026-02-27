# Security Audit Report - Ask Euno MVP (Application)

**Date**: February 27, 2026  
**Scope**: Ask Euno MVP application security hardening  

## Executive Summary

Ask Euno is in a strong security posture for an MVP release. The audit focused on dependency vulnerabilities, authentication/session configuration, input validation, upload handling, OAuth flows, HTTPS enforcement, and rate limiting.

**Status**: Production-ready for MVP, with 2 known non-blocking dependency items remaining (`xlsx` advisory without upstream fix; `esbuild` dev-only advisory requiring a breaking upgrade path).

## Findings & Fixes Applied

### Dependency vulnerabilities
- Resolved multiple npm advisories via dependency updates (including common transitive packages).
- Remaining:
  - `xlsx`: known upstream issue; mitigated via strict file validation and limiting processing scope.
  - `esbuild`: dev dependency; remediation would require a broader tooling upgrade.

### Authentication & authorization
- Password hashing confirmed using bcrypt with appropriate cost.
- Session storage confirmed via PostgreSQL-backed session store.
- **Fix applied**: ensure session cookie `secure` is enabled in production deployments.
- Resource ownership checks and role-based access controls verified in key routes.

### Input validation & sanitization
- Input sanitization middleware confirmed.
- Route-level validation patterns reviewed for common endpoints.
- SQL injection: verified read-only query constraints are enforced where applicable.
- XSS: mitigations in place (sanitization + CSP).
- CSRF: OAuth `state` validation used for CSRF protection in OAuth flows.

### Rate limiting
- Global IP-based rate limiting enabled.
- Sensitive endpoints reviewed for stricter limits (auth and AI/chat where applicable).

### HTTPS & security headers
- HTTPS redirect middleware verified for production.
- Helmet configuration reviewed; HSTS enabled.

### OAuth security
- State validation confirmed.
- Token storage is encrypted at rest in the database where used.

### File upload security
- File type allowlist enforced (CSV/Excel/JSON).
- File size limits and filename checks verified.
- Ownership verification present for access to uploaded artifacts.

## Recommendations (Post-MVP)

1. Replace `xlsx` parsing with a safer/maintained alternative (or isolate parsing in a sandboxed worker) once feasible.
2. Plan a tooling upgrade path to remediate `esbuild` advisory (align with Vite upgrade requirements).
3. Add a periodic dependency update cadence and automated dependency scanning in CI.

