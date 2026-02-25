# Contributing to ModbusScanner

Thank you for taking the time to contribute!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ModbusScanner.git`
3. Install dependencies: `npm install`
4. Create a branch for your change: `git checkout -b feat/your-feature-name`

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue. Include:
- Your OS and Node.js version
- Connection type (RTU or TCP)
- Steps to reproduce
- What you expected vs. what happened

## Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe the use case clearly — what problem does it solve?

## Pull Requests

- Keep changes focused. One concern per PR.
- Follow the existing code style.
- Update `CHANGELOG.md` under the `[Unreleased]` section describing your change.
- Open the PR against the `main` branch.

## Commit Messages

Use the imperative mood and keep the subject line under 72 characters:

```
feat: add support for FC02 discrete inputs
fix: handle timeout correctly on RTU reconnect
docs: update keybindings table in README
```

Common prefixes: `feat`, `fix`, `docs`, `refactor`, `chore`.

## License

By contributing you agree that your contributions will be licensed under the [BSD 3-Clause License](LICENSE).
