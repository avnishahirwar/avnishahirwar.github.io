# Security Policy

## Supported scope

Security reports should identify the affected repository path, the impact, and a safe reproduction summary. Do not include passwords, access tokens, private user data, or other secrets in an issue or pull request.

## Current security boundary

The Avnish AI Connector 0.2.0 release exposes only public website information and fixed public text resources. It has no write tools, account tokens, database, OAuth configuration, or private account integrations.

## Reporting

For a suspected vulnerability, contact the repository owner through a private channel rather than publishing exploit details. Allow time to investigate and prepare a fix before public disclosure.

## Secret handling

- Never commit credentials, API keys, OAuth secrets, recovery codes, or personal access tokens.
- Use the hosting provider's secret manager for production secrets.
- Rotate any credential that may have been exposed.
- Keep public and private data paths separate.
