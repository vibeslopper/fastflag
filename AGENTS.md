# Repository notes

- This checkout has no application source, README, root manifest, CI, or build/test/lint configuration; do not assume a stack or invent project commands.
- `.opencode/opencode.json` registers the `@dietrichgebert/ponytail` plugin; `.opencode/` is OpenCode tooling, not product code.
- `.opencode/.gitignore` excludes local dependency manifests and `node_modules`; do not treat those files as authoritative project requirements.

## Development preferences

- Prefer the simplest maintainable solution.
- Avoid unnecessary dependencies and abstractions.
- Keep changes focused on the requested feature.
- Explain important architectural decisions briefly.
- Run relevant checks after making changes.
- Never claim a test passed unless it was run.
- Never expose secrets or commit credentials.
- Ask before introducing paid services or infrastructure.
