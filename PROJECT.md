# Worldie project guide

Read this before working on the project. It describes the current code and its constraints.

## 1. Overview

Worldie is a static, single-page quiz. Current quizzes identify a country or territory from its flag, name a country's capital from a flag, or name a capital from a country-name prompt; additional question types may be added later. The README's deployment instructions target GitHub Pages, serving the repository root from the `main` branch.

## 2. Design goals

- Keep play quick-fire and keyboard-first: Enter submits or continues, and Escape skips.
- Keep implementation simple and readable to a beginner-to-intermediate web developer.
- Stay light on older devices and slow connections: no runtime framework, web fonts, or icon library; load local flag SVGs only for the current question and the preloaded next flag.

## 3. Hard constraints

- Keep the site static: plain HTML, vanilla JavaScript and Tailwind CSS. Runtime scripts are classic scripts, use ES2015-level syntax, and do not use modules, TypeScript, optional chaining, a framework, or a bundler.
- Tailwind is compiled with the standalone CLI into `output.css`; that production file is committed. Do not use the Play CDN. Any class toggled from JavaScript must appear literally in `index.html` or `app.js` so Tailwind can compile it.
- Do not add runtime `fetch()` or remote/CDN assets. Use relative paths. The app loads local flag SVGs as questions advance and preloads at most the next SVG.
- Do not add animations or transitions, modals, popups, toasts, autocomplete, or suggestions.
- Keep localStorage reads and writes in `try/catch`; validate stored values before restoring them so missing, corrupt, or outdated data cannot break play.

## 4. Project structure

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Repository working rules; directs agents to this guide. |
| `PROJECT.md` | Living description of current behaviour, constraints, and decisions. |
| `README.md` | CSS build, data check, local run, and GitHub Pages instructions. |
| `index.html` | Quiz screens, controls, local stylesheet and classic-script includes. |
| `app.js` | Selection, question queue, rendering, answers, scoring, replay, and persistence. |
| `data.js` | Hand-written runtime data exposed as the global `countries` array. |
| `data/country_flags.json` | Separate 271-entry metadata catalogue, including names, capitals, and 1x1/4x3 asset paths; the page does not load it. |
| `data/flags/4x3/*.svg` | Local flag SVGs used by the quiz. |
| `data/flags/1x1/*.svg` | Local square flag SVGs; not used by the current page. |
| `src/input.css` | Tailwind CSS input and config reference. |
| `tailwind.config.js` | Tailwind content paths (`index.html`, `app.js`) and media-based dark mode. |
| `output.css` | Generated production stylesheet linked by `index.html`. |
| `tailwindcss` | Local standalone Tailwind CLI executable; ignored by `.gitignore` and not a runtime dependency. |
| `check-data.js` | Node.js validation for `data.js` categories, continents, and 4x3 SVGs. |
| `.gitignore` | Excludes the local `tailwindcss` executable. |
| `.nojekyll` | Empty marker that prevents GitHub Pages from running Jekyll. |
| `.opencode/opencode.json` | Registers the Ponytail plugin and loads `PROJECT.md` as OpenCode instructions. |

The 1x1 and 4x3 asset folders currently contain 271 SVGs each. The app only references 4x3 assets whose codes appear in `data.js`.

## 5. Build, run, and deploy

Build the production CSS with the local Tailwind v4 standalone CLI:

```sh
./tailwindcss -i ./src/input.css -o ./output.css --minify
```

Validate the quiz data and required local 4x3 assets with Node.js:

```sh
node check-data.js
```

To run locally, open `index.html` directly in a browser or use any static web server; there is no JavaScript build step or project-specific server command. For deployment, follow `README.md`: publish from GitHub Pages branch `main`, folder `/` (repository root).

## 6. How it works

### Selection and question data

- `data.js` defines `var countries = [...]`. Each entry has `code`, `name`, `continent`, `aliases`, and `category`; country entries also have `capital`, and may have `capitalAliases`. `continent` must be one of the six real continents or `Other`. The code is the key used for the local flag path `data/flags/4x3/<code>.svg`.
- Example: `{ code: "af", name: "Afghanistan", continent: "Asia", aliases: [], category: "countries", capital: "Kabul" }`.
- Current categories are `countries` (197 entries) and `territories` (41); `check-data.js` enforces 197 country entries and valid continents. The default category is `countries`. The only current `Other` entry is a territory; territory entries have no capital in `data.js`.
- Defaults are `place` from `flag`, `submit` answer mode, `countries`, all six real continents, and `Other` checked; Countries-only still selects 197 flags.
- `guessType` is `place` or `capital`; `promptType` is `flag` or `country`. `place` quizzes use a flag prompt and the selected place categories. Capital quizzes use country entries with a capital, and can prompt with either the flag or the country name. The country-name prompt is disabled for place quizzes.
- The six real continent filters and pseudo-continent `Other` select entries by exact `continent` value; every `data.js` entry has exactly one valid value. `Other` is disabled when the currently selected place types contain no `Other` entries, but its checked state is retained. A disabled `Other` checkbox neither adds flags nor satisfies the requirement to select a continent. The hint explains why it is disabled.
- The start button is disabled when there is no selected enabled continent, no selected place type for a place quiz, or no eligible questions.
- Starting a round maps selected entries to codes and shuffles them with the existing Fisher–Yates shuffle. Progress and totals are based on that round's queue. For flag prompts, only the current flag and one next flag are loaded; the border is directly on the `<img>`.

### Answers, skips, scoring, and replay

- `normalise()` trims and lowercases text, decomposes and removes diacritics, converts `&` to `and`, removes punctuation, collapses whitespace, and removes a leading `the `. Place answers match the normalised `name` or any `aliases`; capital answers match `capital` or any `capitalAliases`.
- `submit` is the default answer mode: the form/Enter submits, a wrong answer shows “Incorrect, try again”, and clears the current first-try flag. `auto` checks on input and advances on a match; non-matches are silent and do not clear that flag, so there is no “incorrect” feedback while typing.
- Skip button or Escape records the current code in `skipped`, reveals the answer, and does not re-queue the question. Continue button or Enter advances after a reveal. Wrong answers are not counted as skips.
- `correctFirstTry`, `skipped`, and the total are per round. The end screen lists that round's skipped entries. “Replay skipped” starts a freshly shuffled queue made only from that round's skipped codes, using the same game-start path; its score and skip list reset. Further rounds can replay their own skips. “Play again” starts from the unchanged selection, not the replay subset.
- An active replay stores `replaying: true` so its indicator can return after refresh. Missing `replaying` in an older saved game means false. The end screen itself is not persisted; refreshing after a round returns to the start screen.

### localStorage

All storage access and JSON parsing is guarded by `try/catch`. Invalid values are ignored or the saved game is discarded. The keys are:

| Key | Stored value and validation |
| --- | --- |
| `worldie-state-v1` | JSON `{ continentSelectionVersion, selectedContinents, game }`. Continents must be a non-empty, unique list of known values. Version `2` marks the current selection format; an older saved selection without it gains checked `Other`, while a current unchecked `Other` stays unchecked. `game` is `null` outside play; an active game stores `guessType`, `promptType`, `queue`, `index`, `correctFirstTry`, `skipped`, `firstTry`, `revealed`, and `replaying`. The game validator checks mode, queue eligibility and uniqueness, index, score, skip positions, and booleans. Replay queues may be a non-empty eligible subset; ordinary queues must contain the full eligible set. |
| `worldie-categories-v1` | JSON list of unique known categories; must be non-empty. |
| `worldie-game-mode-v1` | JSON `{ guessType, promptType }`, validated against the supported combinations. Legacy strings `flag-country`, `flag-capital`, and `country-capital` are also accepted. |
| `worldie-answer-mode-v1` | String `submit` or `auto`; other values are ignored. |

The category, game-mode, and answer-mode settings have separate keys; selected continents are stored alongside the active-game record. Storage failures do not prevent the quiz from running.

## 7. Design decisions and rationale

- Compile Tailwind instead of using its CDN: reduce page weight on slow connections.
- Keep quiz data in hand-written `data.js` instead of fetching JSON: support `file://` use without an extra request.
- Put a 1px border on the flag `<img>` instead of using a background colour: keep white flags visible in both light and dark mode.
- Assign one continent per country: keep filtering simple.
- Enable `Other` by counting matching data entries in the selected place types rather than hard-coding a category name: keep the rule correct if place types change.
- Keep the default country set at 197 sovereign states.
- Put South Georgia and the South Sandwich Islands in `Other`: Antarctica is not one of the six selectable real continents, and this territory has no real-continent assignment in the current model.
- Version saved continent selections so older selections gain checked `Other` once while a current unchecked choice remains unchecked.
- In auto-accept mode, do not show “incorrect”: by design, to keep play fast.
- Persist the replay marker with an active game: the replay indicator must survive a refresh.

## 8. Known limitations and ideas

- The app currently supports only place-from-flag and capital-from-flag/country-name question combinations; adding another type will require updating selection, rendering, answer matching, and saved-game validation.
- `data/country_flags.json` and each SVG folder contain 271 entries, while the live `data.js` quiz list contains 238. The JSON is not loaded or checked against `data.js` (it labels South Georgia as Antarctica while the app uses `Other`); its intended relationship to the hand-written list is undocumented (rationale unknown).
- Questions are distinct by `code`; the app does not detect or deduplicate identical flag artwork.
- `check-data.js` is the available data validator. There is no project package manifest, automated browser test suite, or CI configuration in the repository root.
