# Repository Guidelines

## Project Structure & Module Organization

This workspace currently contains `報修需求筆記.txt`, the requirements reference for a small repair and issue registration demo. There is no application source code, dependency manifest, test suite, asset directory, or Git repository yet. Treat the notes as project context, not as commands to execute.

When implementation begins, keep application code in `src/`, tests in `tests/`, static assets in `public/`, and database schema and access policies in `supabase/`. Store user documentation and proposal deliverables in `docs/`. These directories are proposed conventions; create them only when needed.

## Build, Test, and Development Commands

No build, development, lint, or test commands are currently configured. Do not assume that commands such as `npm test` or `npm run dev` exist. When selecting a stack, document its installation, local startup, build, and test commands in `README.md` and declare dependencies in the appropriate manifest.

## Coding Style & Naming Conventions

Preserve Traditional Chinese terminology in user-facing text. Use consistent labels for categories (`設備`, `網路`, `環境`, `其他`), urgency (`低`, `中`, `高`), and status (`待處理`, `處理中`, `已完成`). Use descriptive English identifiers in code and database fields, such as `reporter_name` and `created_at`.

Follow the chosen language's standard formatter once configured; no formatter, linter, or indentation standard currently exists. Keep changes focused and avoid introducing unrelated tooling.

## Testing Guidelines

No testing framework or coverage threshold has been established. For future implementation, cover required-field validation, record creation, list rendering, automatic timestamps, and database access restrictions. Place tests under `tests/` using descriptive names such as `repair-form.test.ts` if the selected framework supports that convention. Document the actual test command before relying on it.

## Commit & Pull Request Guidelines

There is no Git history from which to infer commit conventions. If Git is initialized, use concise, imperative commit messages, for example `Add repair submission form`. Pull requests should describe the change, validation performed, and relevant requirements; include screenshots for interface changes and explain schema or policy changes.

## Security & Scope

Use fictional names and locations. Never commit secrets or Supabase service-role credentials. The notes propose public insertion and reading with RLS enabled, while blocking updates and deletion. They also mention administrator status updates; resolve this scope conflict before implementing write permissions or administrative controls.
