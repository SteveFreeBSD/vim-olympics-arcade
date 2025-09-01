Security Policy

Reporting a Vulnerability
- Please open a security advisory (GitHub Security tab) or email the maintainer privately.
- Do not open a public issue for security-sensitive reports.

Scope
- This is a client‑side learning app. The main vectors are untrusted lesson JSON and DOM rendering.
- Imported lessons are validated and sanitized (`sanitizeLesson`) before use.

Best Practices
- Avoid `dangerouslySetInnerHTML`.
- Keep dependencies up to date; run tests before changes.

