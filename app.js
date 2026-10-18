const $ = function (id) { return document.getElementById(id); };
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const FLAG_TYPES = ["countries", "territories", "regions"];
const GAME_MODES = ["flag-country", "flag-capital", "country-capital"];
const STORAGE_KEY = "flag-quiz-state-v1";
const ANSWER_MODE_KEY = "flag-quiz-answer-mode-v1";
const CATEGORY_KEY = "flag-quiz-categories-v1";
const GAME_MODE_KEY = "flag-quiz-game-mode-v1";
const state = {
  screen: "start",
  answerMode: "submit",
  gameMode: "flag-country",
  selectedContinents: CONTINENTS.slice(),
  selectedCategories: ["countries"],
  queue: [],
  index: 0,
  correctFirstTry: 0,
  skipped: [],
  firstTry: true,
  revealed: false,
  preload: null
};
const elements = {
  startScreen: $("start-screen"), playScreen: $("play-screen"), endScreen: $("end-screen"),
  gameHint: $("game-hint"), gameModeInputs: Array.from(document.querySelectorAll('input[name="game-mode"]')),
  answerModeInputs: Array.from(document.querySelectorAll('input[name="answer-mode"]')),
  continentInputs: Array.from(document.querySelectorAll("#continent-list input")),
  categoryInputs: Array.from(document.querySelectorAll("#category-list input")),
  categoryFieldset: $("flag-type-fieldset"), capitalModeNote: $("capital-mode-note"),
  countryCount: $("country-count"), startButton: $("start-button"), progress: $("progress"),
  playHeading: $("play-heading"), countryPrompt: $("country-prompt"), flagImage: $("flag-image"),
  answerLabel: $("answer-label"), answerForm: $("answer-form"), guessInput: $("guess-input"),
  submitButton: $("submit-button"), answerHint: $("answer-hint"), answerMessage: $("answer-message"), skipButton: $("skip-button"),
  continueButton: $("continue-button"), endTotalLabel: $("end-total-label"), endTotal: $("end-total"), endCorrect: $("end-correct"),
  endSkipped: $("end-skipped"), skippedHeading: $("skipped-heading"), skippedList: $("skipped-list"), noSkips: $("no-skips")
};

function normalise(value) {
  return value.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and")
    .replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/^the /, "");
}

function flagPath(code) {
  return "data/flags/4x3/" + code + ".svg";
}

function currentFlag() {
  return countries.find(flag => flag.code === state.queue[state.index]);
}

function selectedFlags(gameMode) {
  const mode = gameMode || state.gameMode;
  return countries.filter(flag => {
    const selectedType = mode === "flag-country"
      ? state.selectedCategories.indexOf(flag.category) !== -1
      : flag.category === "countries" && Boolean(flag.capital);
    return selectedType && (!flag.continent || state.selectedContinents.indexOf(flag.continent) !== -1);
  });
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    const item = items[index];
    items[index] = items[otherIndex];
    items[otherIndex] = item;
  }
  return items;
}

function readSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

function saveState() {
  const game = state.screen === "playing" ? {
    mode: state.gameMode, queue: state.queue, index: state.index, correctFirstTry: state.correctFirstTry,
    skipped: state.skipped, firstTry: state.firstTry, revealed: state.revealed
  } : null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedContinents: state.selectedContinents, game: game }));
  } catch (error) {
    // The quiz still works when browser storage is disabled or full.
  }
}

function validCategories(categories) {
  return Array.isArray(categories) && categories.length > 0 &&
    categories.every(category => FLAG_TYPES.indexOf(category) !== -1) &&
    new Set(categories).size === categories.length;
}

function restoreCategories() {
  try {
    const saved = localStorage.getItem(CATEGORY_KEY);
    const categories = saved ? JSON.parse(saved) : null;
    if (validCategories(categories)) state.selectedCategories = categories.slice();
  } catch (error) {
    // Countries remain selected when browser storage is unavailable or invalid.
  }
}

function saveCategories() {
  try {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(state.selectedCategories));
  } catch (error) {
    // The selected categories still work until the page is closed.
  }
}

function restoreGameMode() {
  try {
    const savedMode = localStorage.getItem(GAME_MODE_KEY);
    if (GAME_MODES.indexOf(savedMode) !== -1) state.gameMode = savedMode;
  } catch (error) {
    // The flag quiz remains the default when storage is unavailable.
  }
}

function saveGameMode() {
  try {
    localStorage.setItem(GAME_MODE_KEY, state.gameMode);
  } catch (error) {
    // The selected quiz still works until the page is closed.
  }
}

function restoreAnswerMode() {
  try {
    const savedMode = localStorage.getItem(ANSWER_MODE_KEY);
    if (savedMode === "submit" || savedMode === "auto") state.answerMode = savedMode;
  } catch (error) {
    // Enter-to-submit remains the default when storage is unavailable.
  }
}

function saveAnswerMode() {
  try {
    localStorage.setItem(ANSWER_MODE_KEY, state.answerMode);
  } catch (error) {
    // The selected mode still works until the page is closed.
  }
}

function validSelection(selection) {
  return Array.isArray(selection) && selection.length > 0 &&
    selection.every(continent => CONTINENTS.indexOf(continent) !== -1) &&
    new Set(selection).size === selection.length;
}

function validGame(game) {
  if (!game || !Array.isArray(game.queue) || !Array.isArray(game.skipped) ||
      !Number.isInteger(game.index) || !Number.isInteger(game.correctFirstTry) ||
      game.correctFirstTry < 0 || typeof game.firstTry !== "boolean" || typeof game.revealed !== "boolean") return false;

  const gameMode = game.mode === undefined ? "flag-country" : game.mode;
  if (GAME_MODES.indexOf(gameMode) === -1) return false;
  const eligible = new Set(selectedFlags(gameMode).map(flag => flag.code));
  const queue = new Set(game.queue);
  const skipped = new Set(game.skipped);
  if (game.queue.length !== eligible.size || game.index < 0 || game.index >= game.queue.length ||
      queue.size !== game.queue.length || game.queue.some(code => !eligible.has(code)) ||
      skipped.size !== game.skipped.length) return false;

  const skippedBefore = game.skipped.filter(code => game.queue.indexOf(code) < game.index).length;
  if (game.skipped.some(code => {
    const position = game.queue.indexOf(code);
    return position < 0 || position > game.index || (position === game.index && !game.revealed);
  })) return false;
  return game.revealed === skipped.has(game.queue[game.index]) &&
    game.correctFirstTry <= game.index - skippedBefore;
}

function restoreState() {
  const saved = readSavedState();
  if (!saved || !validSelection(saved.selectedContinents)) return;
  state.selectedContinents = saved.selectedContinents.slice();
  if (!saved.game) return;
  if (!validGame(saved.game)) {
    saveState();
    return;
  }
  state.screen = "playing";
  state.gameMode = saved.game.mode === undefined ? "flag-country" : saved.game.mode;
  saveGameMode();
  state.queue = saved.game.queue.slice();
  state.index = saved.game.index;
  state.correctFirstTry = saved.game.correctFirstTry;
  state.skipped = saved.game.skipped.slice();
  state.firstTry = saved.game.firstTry;
  state.revealed = saved.game.revealed;
}

function updateStartScreen() {
  elements.gameModeInputs.forEach(input => {
    input.checked = input.value === state.gameMode;
  });
  elements.continentInputs.forEach(input => {
    input.checked = state.selectedContinents.indexOf(input.value) !== -1;
  });
  elements.categoryInputs.forEach(input => {
    input.checked = state.selectedCategories.indexOf(input.value) !== -1;
  });
  const flagQuiz = state.gameMode === "flag-country";
  elements.categoryFieldset.classList.toggle("hidden", !flagQuiz);
  elements.capitalModeNote.classList.toggle("hidden", flagQuiz);
  const count = selectedFlags().length;
  elements.countryCount.textContent = count + (flagQuiz
    ? (count === 1 ? " flag selected" : " flags selected")
    : (count === 1 ? " country selected" : " countries selected"));
  elements.startButton.disabled = state.selectedContinents.length === 0 ||
    (flagQuiz && state.selectedCategories.length === 0) || count === 0;
}

function updateAnswerMode() {
  const autoAccept = state.answerMode === "auto";
  const flagQuiz = state.gameMode === "flag-country";
  const countryPrompt = state.gameMode === "country-capital";
  elements.answerModeInputs.forEach(input => {
    input.checked = input.value === state.answerMode;
  });
  elements.answerLabel.textContent = flagQuiz ? "Country or region" : "Capital city";
  elements.playHeading.textContent = flagQuiz ? "Identify the flag" : "Name the capital";
  elements.submitButton.classList.toggle("hidden", autoAccept);
  elements.answerHint.classList.toggle("hidden", !autoAccept);
  elements.answerHint.textContent = autoAccept ? "Auto-accept: just type the answer. Esc to skip." : "";
  const prompt = flagQuiz ? "Name the country or region from the flag."
    : (countryPrompt ? "Name the capital of the country shown." : "Name the capital from the flag.");
  elements.gameHint.textContent = prompt + (autoAccept
    ? " Just type the answer or Esc to skip."
    : " Press Enter to answer or Esc to skip.");
}

function preloadNextFlag() {
  state.preload = state.index + 1 < state.queue.length ? new Image() : null;
  if (state.preload) state.preload.src = flagPath(state.queue[state.index + 1]);
}

function renderPlaying() {
  const flag = currentFlag();
  if (!flag) return finishGame();
  elements.progress.textContent = (state.index + 1) + " / " + state.queue.length;
  const countryPrompt = state.gameMode === "country-capital";
  elements.flagImage.classList.toggle("hidden", countryPrompt);
  elements.countryPrompt.classList.toggle("hidden", !countryPrompt);
  elements.countryPrompt.textContent = countryPrompt ? flag.name : "";
  if (countryPrompt) {
    elements.flagImage.removeAttribute("src");
    state.preload = null;
  } else {
    elements.flagImage.src = flagPath(flag.code);
    preloadNextFlag();
  }
  elements.guessInput.value = "";
  elements.guessInput.disabled = state.revealed;
  elements.submitButton.disabled = state.revealed;
  elements.skipButton.classList.toggle("hidden", state.revealed);
  elements.continueButton.classList.toggle("hidden", !state.revealed);
  elements.answerMessage.classList.remove("text-rose-700", "dark:text-rose-300");
  elements.answerMessage.textContent = state.revealed
    ? (state.gameMode === "flag-country" ? "Skipped. The answer was " + flag.name + "."
      : "Skipped. The capital was " + flag.capital + ".")
    : "";
  (state.revealed ? elements.continueButton : elements.guessInput).focus();
}

function renderEndScreen() {
  const flagQuiz = state.gameMode === "flag-country";
  elements.endTotalLabel.textContent = flagQuiz ? "Flags:" : "Questions:";
  elements.skippedHeading.textContent = flagQuiz ? "Skipped places" : "Skipped capitals";
  elements.endTotal.textContent = state.queue.length;
  elements.endCorrect.textContent = state.correctFirstTry;
  elements.endSkipped.textContent = state.skipped.length;
  elements.skippedList.textContent = "";
  elements.noSkips.classList.toggle("hidden", state.skipped.length > 0);
  state.skipped.forEach(code => {
    const flag = countries.find(item => item.code === code);
    const listItem = document.createElement("li");
    listItem.textContent = flagQuiz ? flag.name : flag.name + " — " + flag.capital;
    elements.skippedList.appendChild(listItem);
  });
}

function render() {
  updateAnswerMode();
  elements.startScreen.classList.toggle("hidden", state.screen !== "start");
  elements.playScreen.classList.toggle("hidden", state.screen !== "playing");
  elements.endScreen.classList.toggle("hidden", state.screen !== "end");
  if (state.screen === "start") updateStartScreen();
  else if (state.screen === "playing") renderPlaying();
  else renderEndScreen();
}

function startGame() {
  const queue = selectedFlags().map(flag => flag.code);
  if (!queue.length) return;
  state.queue = shuffle(queue);
  state.index = 0;
  state.correctFirstTry = 0;
  state.skipped = [];
  state.firstTry = true;
  state.revealed = false;
  state.screen = "playing";
  saveState();
  render();
}

function finishGame() {
  state.screen = "end";
  saveState();
  render();
}

function moveNext() {
  state.index += 1;
  state.firstTry = true;
  state.revealed = false;
  if (state.index === state.queue.length) return finishGame();
  saveState();
  render();
}

function skipCurrent() {
  if (state.screen !== "playing" || state.revealed) return;
  state.skipped.push(currentFlag().code);
  state.revealed = true;
  saveState();
  render();
}

function checkAnswer() {
  const guess = normalise(elements.guessInput.value);
  if (!guess) {
    if (state.answerMode === "submit") elements.guessInput.focus();
    return;
  }
  const flag = currentFlag();
  const answers = state.gameMode === "flag-country"
    ? [flag.name].concat(flag.aliases)
    : [flag.capital].concat(flag.capitalAliases || []);
  const correct = answers.some(answer => normalise(answer) === guess);
  if (correct) {
    if (state.firstTry) state.correctFirstTry += 1;
    return moveNext();
  }
  if (state.answerMode === "auto") return;
  state.firstTry = false;
  elements.answerMessage.textContent = "Incorrect, try again.";
  elements.answerMessage.classList.add("text-rose-700", "dark:text-rose-300");
  saveState();
  elements.guessInput.focus();
  elements.guessInput.select();
}

function clearGame() {
  state.screen = "start";
  state.queue = [];
  state.index = 0;
  state.correctFirstTry = 0;
  state.skipped = [];
  state.firstTry = true;
  state.revealed = false;
  saveState();
  render();
}

elements.continentInputs.forEach(input => input.addEventListener("change", () => {
  state.selectedContinents = elements.continentInputs.filter(item => item.checked).map(item => item.value);
  saveState();
  updateStartScreen();
}));
elements.gameModeInputs.forEach(input => input.addEventListener("change", () => {
  if (!input.checked) return;
  state.gameMode = input.value;
  saveGameMode();
  updateAnswerMode();
  updateStartScreen();
}));
elements.categoryInputs.forEach(input => input.addEventListener("change", () => {
  state.selectedCategories = elements.categoryInputs.filter(item => item.checked).map(item => item.value);
  saveCategories();
  updateStartScreen();
}));
elements.answerModeInputs.forEach(input => input.addEventListener("change", () => {
  if (!input.checked) return;
  state.answerMode = input.value === "auto" ? "auto" : "submit";
  saveAnswerMode();
  elements.answerMessage.textContent = "";
  elements.answerMessage.classList.remove("text-rose-700", "dark:text-rose-300");
  updateAnswerMode();
}));
elements.startButton.addEventListener("click", startGame);
elements.answerForm.addEventListener("submit", event => {
  event.preventDefault();
  if (state.revealed) moveNext();
  else if (state.answerMode === "submit") checkAnswer();
});
elements.guessInput.addEventListener("input", () => {
  if (state.screen === "playing" && !state.revealed && state.answerMode === "auto") checkAnswer();
});
elements.skipButton.addEventListener("click", skipCurrent);
elements.continueButton.addEventListener("click", moveNext);
$("quit-button").addEventListener("click", clearGame);
$("play-again-button").addEventListener("click", startGame);
$("change-button").addEventListener("click", clearGame);

document.addEventListener("keydown", event => {
  if (state.screen !== "playing") return;
  if (event.key === "Escape") {
    event.preventDefault();
    skipCurrent();
  } else if (event.key === "Enter" && state.revealed) {
    event.preventDefault();
    moveNext();
  }
});

restoreAnswerMode();
restoreCategories();
restoreGameMode();
restoreState();
render();
