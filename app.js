const $ = function (id) { return document.getElementById(id); };
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const STORAGE_KEY = "flag-quiz-state-v1";
const state = {
  screen: "start",
  selectedContinents: CONTINENTS.slice(),
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
  continentInputs: Array.from(document.querySelectorAll("#continent-list input")),
  countryCount: $("country-count"), startButton: $("start-button"), progress: $("progress"),
  flagImage: $("flag-image"), answerForm: $("answer-form"), guessInput: $("guess-input"),
  submitButton: $("submit-button"), answerMessage: $("answer-message"), skipButton: $("skip-button"),
  continueButton: $("continue-button"), endTotal: $("end-total"), endCorrect: $("end-correct"),
  endSkipped: $("end-skipped"), skippedList: $("skipped-list"), noSkips: $("no-skips")
};

function normalise(value) {
  return value.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and")
    .replace(/[^\w\s]/g, "").replace(/\s+/g, " ").replace(/^the /, "");
}

function flagPath(code) {
  return "data/flags/4x3/" + code + ".svg";
}

function currentCountry() {
  return countries.find(country => country.code === state.queue[state.index]);
}

function selectedCountries() {
  return countries.filter(country => state.selectedContinents.indexOf(country.continent) !== -1);
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
    queue: state.queue, index: state.index, correctFirstTry: state.correctFirstTry,
    skipped: state.skipped, firstTry: state.firstTry, revealed: state.revealed
  } : null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedContinents: state.selectedContinents, game: game }));
  } catch (error) {
    // The quiz still works when browser storage is disabled or full.
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

  const eligible = new Set(selectedCountries().map(country => country.code));
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
  state.queue = saved.game.queue.slice();
  state.index = saved.game.index;
  state.correctFirstTry = saved.game.correctFirstTry;
  state.skipped = saved.game.skipped.slice();
  state.firstTry = saved.game.firstTry;
  state.revealed = saved.game.revealed;
}

function updateStartScreen() {
  elements.continentInputs.forEach(input => {
    input.checked = state.selectedContinents.indexOf(input.value) !== -1;
  });
  const count = selectedCountries().length;
  elements.countryCount.textContent = count + (count === 1 ? " flag selected" : " flags selected");
  elements.startButton.disabled = state.selectedContinents.length === 0;
}

function preloadNextFlag() {
  state.preload = state.index + 1 < state.queue.length ? new Image() : null;
  if (state.preload) state.preload.src = flagPath(state.queue[state.index + 1]);
}

function renderPlaying() {
  const country = currentCountry();
  if (!country) return finishGame();
  elements.progress.textContent = (state.index + 1) + " / " + state.queue.length;
  elements.flagImage.src = flagPath(country.code);
  elements.guessInput.value = "";
  elements.guessInput.disabled = state.revealed;
  elements.submitButton.disabled = state.revealed;
  elements.skipButton.classList.toggle("hidden", state.revealed);
  elements.continueButton.classList.toggle("hidden", !state.revealed);
  elements.answerMessage.classList.remove("text-rose-700", "dark:text-rose-300");
  elements.answerMessage.textContent = state.revealed ? "Skipped. The answer was " + country.name + "." : "";
  preloadNextFlag();
  (state.revealed ? elements.continueButton : elements.guessInput).focus();
}

function renderEndScreen() {
  elements.endTotal.textContent = state.queue.length;
  elements.endCorrect.textContent = state.correctFirstTry;
  elements.endSkipped.textContent = state.skipped.length;
  elements.skippedList.textContent = "";
  elements.noSkips.classList.toggle("hidden", state.skipped.length > 0);
  state.skipped.forEach(code => {
    const country = countries.find(item => item.code === code);
    const listItem = document.createElement("li");
    listItem.textContent = country.name;
    elements.skippedList.appendChild(listItem);
  });
}

function render() {
  elements.startScreen.classList.toggle("hidden", state.screen !== "start");
  elements.playScreen.classList.toggle("hidden", state.screen !== "playing");
  elements.endScreen.classList.toggle("hidden", state.screen !== "end");
  if (state.screen === "start") updateStartScreen();
  else if (state.screen === "playing") renderPlaying();
  else renderEndScreen();
}

function startGame() {
  const queue = selectedCountries().map(country => country.code);
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
  state.skipped.push(currentCountry().code);
  state.revealed = true;
  saveState();
  render();
}

function submitAnswer() {
  const guess = normalise(elements.guessInput.value);
  if (!guess) return elements.guessInput.focus();
  const country = currentCountry();
  const correct = [country.name].concat(country.aliases).some(answer => normalise(answer) === guess);
  if (correct) {
    if (state.firstTry) state.correctFirstTry += 1;
    return moveNext();
  }
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
elements.startButton.addEventListener("click", startGame);
elements.answerForm.addEventListener("submit", event => {
  event.preventDefault();
  if (state.revealed) moveNext();
  else submitAnswer();
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

restoreState();
render();
