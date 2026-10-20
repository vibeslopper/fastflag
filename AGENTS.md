# Repository instructions

Worldie is a static quiz web app for flags, capital cities, and possibly more question types.
Read `PROJECT.md` before starting any task; it is the full description of the project.

## Repository note

- `.opencode/opencode.json` registers the `@dietrichgebert/ponytail` plugin and loads `PROJECT.md`; `.opencode/` is OpenCode configuration, not product code.

## Development preferences

- Prefer the simplest maintainable solution.
- Avoid unnecessary dependencies and abstractions.
- Keep changes focused on the requested feature.
- Explain important architectural decisions briefly.
- Run relevant checks after making changes.
- Never claim a test passed unless it was run.
- Never expose secrets or commit credentials.
- Ask before introducing paid services or infrastructure.

## Working rules

- Make the smallest diff that does the job. Follow existing style and structure; do not refactor, rename, or "improve" unrelated code.
- Do not touch `data/`.
- Never run Git commands or modify Git state.
- Do not create new files, tests, or scripts unless asked.
- Ask when a request is ambiguous or conflicts with constraints in `PROJECT.md`.
- For large or judgement-heavy changes, investigate and report first, then wait for approval.
- Keep final messages short: say which files changed, plus a reminder to rebuild `output.css` if Tailwind classes were added.
- After completing any change, update `PROJECT.md` in the same edit if anything it describes has changed (structure, behaviour, data shape, localStorage keys, constraints, limitations, design decisions). Add a one-line entry to its design-decisions section whenever a non-obvious choice is made, but only record rationale you actually know or that I gave you; never invent reasons. Edit existing text rather than appending change logs, and remove anything no longer true. Leave `PROJECT.md` untouched if nothing it describes changed. Leave `README.md` alone unless it's now inaccurate. State in your final message whether `PROJECT.md` was updated.
