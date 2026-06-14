# Security Policy

## Architecture

CardPin is a **fully static, client-side application** with no backend, no authentication, no database, and no server-side processing. All data is stored in static JSON files served over HTTP. User preferences (owned cards, country selection) are stored exclusively in the browser's `localStorage`.

CardPin does not:
- Collect, transmit, or store any personal data
- Use cookies, analytics, or telemetry
- Make any API calls to external services
- Process any financial transactions

## Reporting a Vulnerability

If you discover a security vulnerability in CardPin, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. If a private security advisory is available on GitHub, use it.
3. If no private channel is available, contact the maintainer through their GitHub profile and include only enough public information to establish contact.
4. Include a clear description of the vulnerability and steps to reproduce it once a private channel is established.
5. Allow reasonable time for a fix before public disclosure.

## Scope

Given CardPin's static architecture, the most relevant security concerns are:

- **Supply chain attacks** via compromised npm dependencies
- **Cross-site scripting (XSS)** through data injection in JSON datasets
- **Misleading data** that could cause financial harm (covered by our [Disclaimer](DISCLAIMER.md))

We take all reports seriously and will respond promptly.
