const $ = function (id) {
    return document.getElementById(id);
};
const CONTINENTS = [
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Oceania",
    "Other",
];
const CONTINENT_SELECTION_VERSION = 2;
const FLAG_TYPES = ["countries", "territories"];
const GUESS_TYPES = ["place", "capital"];
const PROMPT_TYPES = ["flag", "country"];
const STORAGE_KEY = "worldie-state-v1";
const ANSWER_MODE_KEY = "worldie-answer-mode-v1";
const CATEGORY_KEY = "worldie-categories-v1";
const GAME_MODE_KEY = "worldie-game-mode-v1";
const state = {
    screen: "start",
    answerMode: "submit",
    guessType: "place",
    promptType: "flag",
    selectedContinents: CONTINENTS.slice(),
    selectedCategories: ["countries"],
    queue: [],
    index: 0,
    correctFirstTry: 0,
    skipped: [],
    firstTry: true,
    revealed: false,
    replaying: false,
    preload: null,
};
const elements = {
    startScreen: $("start-screen"),
    playScreen: $("play-screen"),
    endScreen: $("end-screen"),
    gameHint: $("game-hint"),
    guessTypeInputs: Array.from(
        document.querySelectorAll('input[name="guess-type"]')
    ),
    promptTypeInputs: Array.from(
        document.querySelectorAll('input[name="prompt-type"]')
    ),
    countryPromptInput: $("country-prompt-input"),
    modeNote: $("mode-note"),
    answerModeInputs: Array.from(
        document.querySelectorAll('input[name="answer-mode"]')
    ),
    continentInputs: Array.from(
        document.querySelectorAll("#continent-list input")
    ),
    categoryInputs: Array.from(
        document.querySelectorAll("#category-list input")
    ),
    countryCount: $("country-count"),
    startButton: $("start-button"),
    otherContinentNote: $("other-continent-note"),
    replayIndicator: $("replay-indicator"),
    progress: $("progress"),
    playHeading: $("play-heading"),
    countryPrompt: $("country-prompt"),
    flagImage: $("flag-image"),
    answerLabel: $("answer-label"),
    answerForm: $("answer-form"),
    guessInput: $("guess-input"),
    submitButton: $("submit-button"),
    answerHint: $("answer-hint"),
    answerMessage: $("answer-message"),
    skipButton: $("skip-button"),
    continueButton: $("continue-button"),
    endTotalLabel: $("end-total-label"),
    endTotal: $("end-total"),
    endCorrect: $("end-correct"),
    endSkipped: $("end-skipped"),
    skippedHeading: $("skipped-heading"),
    skippedList: $("skipped-list"),
    noSkips: $("no-skips"),
    replayButton: $("replay-button"),
};

function normalise(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "and")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^the /, "");
}

function flagPath(code) {
    return "data/flags/4x3/" + code + ".svg";
}

function currentFlag() {
    return countries.find((flag) => flag.code === state.queue[state.index]);
}

function selectedFlags(guessType, promptType) {
    const guess = guessType || state.guessType;
    const prompt = promptType || state.promptType;
    return countries.filter((flag) => {
        const selectedType =
            guess === "place" && prompt === "flag"
                ? state.selectedCategories.indexOf(flag.category) !== -1
                : guess === "capital" &&
                  flag.category === "countries" &&
                  Boolean(flag.capital);
        return (
            selectedType &&
            state.selectedContinents.indexOf(flag.continent) !== -1
        );
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
    const game =
        state.screen === "playing"
            ? {
                  guessType: state.guessType,
                  promptType: state.promptType,
                  queue: state.queue,
                  index: state.index,
                  correctFirstTry: state.correctFirstTry,
                  skipped: state.skipped,
                  firstTry: state.firstTry,
                  revealed: state.revealed,
                  replaying: state.replaying,
               }
            : null;
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                continentSelectionVersion: CONTINENT_SELECTION_VERSION,
                selectedContinents: state.selectedContinents,
                game: game,
            })
        );
    } catch (error) {
        // The quiz still works when browser storage is disabled or full.
    }
}

function validCategories(categories) {
    return (
        Array.isArray(categories) &&
        categories.length > 0 &&
        categories.every((category) => FLAG_TYPES.indexOf(category) !== -1) &&
        new Set(categories).size === categories.length
    );
}

function restoreCategories() {
    try {
        const saved = localStorage.getItem(CATEGORY_KEY);
        const categories = saved ? JSON.parse(saved) : null;
        if (validCategories(categories))
            state.selectedCategories = categories.slice();
    } catch (error) {
        // Countries remain selected when browser storage is unavailable or invalid.
    }
}

function saveCategories() {
    try {
        localStorage.setItem(
            CATEGORY_KEY,
            JSON.stringify(state.selectedCategories)
        );
    } catch (error) {
        // The selected categories still work until the page is closed.
    }
}

function restoreGameMode() {
    try {
        const saved = localStorage.getItem(GAME_MODE_KEY);
        if (!saved) return;
        let mode;
        try {
            mode = JSON.parse(saved);
        } catch (error) {
            mode = legacyGameMode(saved);
        }
        if (typeof mode === "string") mode = legacyGameMode(mode);
        if (mode && validGameMode(mode.guessType, mode.promptType)) {
            state.guessType = mode.guessType;
            state.promptType = mode.promptType;
        }
    } catch (error) {
        // The flag quiz remains the default when storage is unavailable.
    }
}

function validGameMode(guessType, promptType) {
    return (
        GUESS_TYPES.indexOf(guessType) !== -1 &&
        (guessType === "place"
            ? promptType === "flag"
            : PROMPT_TYPES.indexOf(promptType) !== -1)
    );
}

function legacyGameMode(mode) {
    if (mode === "flag-country")
        return { guessType: "place", promptType: "flag" };
    if (mode === "flag-capital")
        return { guessType: "capital", promptType: "flag" };
    if (mode === "country-capital")
        return { guessType: "capital", promptType: "country" };
    return null;
}

function savedGameMode(game) {
    if (game.guessType !== undefined || game.promptType !== undefined) {
        return { guessType: game.guessType, promptType: game.promptType };
    }
    return game.mode === undefined
        ? { guessType: "place", promptType: "flag" }
        : legacyGameMode(game.mode);
}

function saveGameMode() {
    try {
        localStorage.setItem(
            GAME_MODE_KEY,
            JSON.stringify({
                guessType: state.guessType,
                promptType: state.promptType,
            })
        );
    } catch (error) {
        // The selected quiz still works until the page is closed.
    }
}

function restoreAnswerMode() {
    try {
        const savedMode = localStorage.getItem(ANSWER_MODE_KEY);
        if (savedMode === "submit" || savedMode === "auto")
            state.answerMode = savedMode;
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
    return (
        Array.isArray(selection) &&
        selection.length > 0 &&
        selection.every((continent) => CONTINENTS.indexOf(continent) !== -1) &&
        new Set(selection).size === selection.length
    );
}

function validGame(game) {
    if (
        !game ||
        !Array.isArray(game.queue) ||
        !Array.isArray(game.skipped) ||
        !Number.isInteger(game.index) ||
        !Number.isInteger(game.correctFirstTry) ||
        game.correctFirstTry < 0 ||
        typeof game.firstTry !== "boolean" ||
        typeof game.revealed !== "boolean" ||
        (game.replaying !== undefined && typeof game.replaying !== "boolean")
    )
        return false;

    const replaying = game.replaying === true;
    const gameMode = savedGameMode(game);
    if (!gameMode || !validGameMode(gameMode.guessType, gameMode.promptType))
        return false;
    const eligible = new Set(
        selectedFlags(gameMode.guessType, gameMode.promptType).map(
            (flag) => flag.code
        )
    );
    const queue = new Set(game.queue);
    const skipped = new Set(game.skipped);
    if (
        game.queue.length === 0 ||
        game.queue.length > eligible.size ||
        (!replaying && game.queue.length !== eligible.size) ||
        game.index < 0 ||
        game.index >= game.queue.length ||
        queue.size !== game.queue.length ||
        game.queue.some((code) => !eligible.has(code)) ||
        skipped.size !== game.skipped.length
    )
        return false;

    const skippedBefore = game.skipped.filter(
        (code) => game.queue.indexOf(code) < game.index
    ).length;
    if (
        game.skipped.some((code) => {
            const position = game.queue.indexOf(code);
            return (
                position < 0 ||
                position > game.index ||
                (position === game.index && !game.revealed)
            );
        })
    )
        return false;
    return (
        game.revealed === skipped.has(game.queue[game.index]) &&
        game.correctFirstTry <= game.index - skippedBefore
    );
}

function restoreState() {
    const saved = readSavedState();
    if (!saved || !validSelection(saved.selectedContinents)) return;
    state.selectedContinents = saved.selectedContinents.slice();
    if (
        saved.continentSelectionVersion !== CONTINENT_SELECTION_VERSION &&
        state.selectedContinents.indexOf("Other") === -1
    )
        state.selectedContinents.push("Other");
    if (!saved.game) return;
    if (!validGame(saved.game)) {
        saveState();
        return;
    }
    state.screen = "playing";
    const gameMode = savedGameMode(saved.game);
    state.guessType = gameMode.guessType;
    state.promptType = gameMode.promptType;
    saveGameMode();
    state.queue = saved.game.queue.slice();
    state.index = saved.game.index;
    state.correctFirstTry = saved.game.correctFirstTry;
    state.skipped = saved.game.skipped.slice();
    state.firstTry = saved.game.firstTry;
    state.revealed = saved.game.revealed;
    state.replaying = saved.game.replaying === true;
}

function updateStartScreen() {
    elements.guessTypeInputs.forEach((input) => {
        input.checked = input.value === state.guessType;
    });
    elements.promptTypeInputs.forEach((input) => {
        input.checked = input.value === state.promptType;
    });
    elements.continentInputs.forEach((input) => {
        input.checked = state.selectedContinents.indexOf(input.value) !== -1;
    });
    const placeFromFlag =
        state.guessType === "place" && state.promptType === "flag";
    elements.categoryInputs.forEach((input) => {
        input.disabled = !placeFromFlag;
        input.checked = placeFromFlag
            ? state.selectedCategories.indexOf(input.value) !== -1
            : input.value === "countries";
        input.parentElement.classList.toggle(
            "opacity-50",
            !placeFromFlag && input.value === "territories"
        );
    });
    const selectedPlaceTypes = elements.categoryInputs
        .filter((input) => input.checked)
        .map((input) => input.value);
    const otherCount = countries.filter(
        (flag) =>
            flag.continent === "Other" &&
            selectedPlaceTypes.indexOf(flag.category) !== -1
    ).length;
    const otherContinent = elements.continentInputs.find(
        (input) => input.value === "Other"
    );
    const otherDisabled = otherCount === 0;
    otherContinent.disabled = otherDisabled;
    otherContinent.parentElement.classList.toggle(
        "opacity-50",
        otherDisabled
    );
    elements.otherContinentNote.classList.toggle("hidden", !otherDisabled);
    elements.countryPromptInput.disabled = state.guessType === "place";
    elements.countryPromptInput.parentElement.classList.toggle(
        "opacity-50",
        state.guessType === "place"
    );
    const placeQuiz = state.guessType === "place";
    elements.modeNote.textContent = placeQuiz
        ? "Place quizzes use flags; country-name prompts are for capitals."
        : "Capital quizzes use countries only; territories and dependencies are unavailable.";
    const count = selectedFlags().length;
    elements.countryCount.textContent =
        count +
        (placeQuiz
            ? count === 1
                ? " flag selected"
                : " flags selected"
            : count === 1
            ? " country selected"
            : " countries selected");
    const hasSelectedContinent = elements.continentInputs.some(
        (input) => input.checked && !input.disabled
    );
    elements.startButton.disabled =
        !hasSelectedContinent ||
        (placeFromFlag && state.selectedCategories.length === 0) ||
        count === 0;
}

function updateAnswerMode() {
    const autoAccept = state.answerMode === "auto";
    const placeQuiz = state.guessType === "place";
    const countryPrompt = state.promptType === "country";
    elements.answerModeInputs.forEach((input) => {
        input.checked = input.value === state.answerMode;
    });
    elements.answerLabel.textContent = placeQuiz
        ? "Country or territory"
        : "Capital city";
    elements.playHeading.textContent = placeQuiz
        ? "Identify the flag"
        : "Name the capital";
    elements.submitButton.classList.toggle("hidden", autoAccept);
    elements.answerHint.classList.toggle("hidden", !autoAccept);
    elements.answerHint.textContent = autoAccept
        ? "Auto-accept: just type the answer. Esc to skip."
        : "";
    const prompt = placeQuiz
        ? "Name the country or territory from the flag."
        : countryPrompt
        ? "Name the capital of the country shown."
        : "Name the capital from the flag.";
    elements.gameHint.textContent =
        prompt +
        (autoAccept
            ? " Just type the answer or Esc to skip."
            : " Press Enter to answer or Esc to skip.");
}

function preloadNextFlag() {
    state.preload = state.index + 1 < state.queue.length ? new Image() : null;
    if (state.preload)
        state.preload.src = flagPath(state.queue[state.index + 1]);
}

function renderPlaying() {
    const flag = currentFlag();
    if (!flag) return finishGame();
    elements.replayIndicator.classList.toggle("hidden", !state.replaying);
    elements.progress.textContent =
        state.index + 1 + " / " + state.queue.length;
    const countryPrompt = state.promptType === "country";
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
    elements.answerMessage.classList.remove(
        "text-rose-700",
        "dark:text-rose-300"
    );
    elements.answerMessage.textContent = state.revealed
        ? state.guessType === "place"
            ? "Skipped. The answer was " + flag.name + "."
            : "Skipped. The capital was " + flag.capital + "."
        : "";
    (state.revealed ? elements.continueButton : elements.guessInput).focus();
}

function renderEndScreen() {
    const placeQuiz = state.guessType === "place";
    const flagQuiz = placeQuiz && state.promptType === "flag";
    elements.endTotalLabel.textContent = flagQuiz ? "Flags:" : "Questions:";
    elements.skippedHeading.textContent = placeQuiz
        ? "Skipped places"
        : "Skipped capitals";
    elements.endTotal.textContent = state.queue.length;
    elements.endCorrect.textContent = state.correctFirstTry;
    elements.endSkipped.textContent = state.skipped.length;
    elements.replayButton.textContent =
        "Replay skipped (" + state.skipped.length + ")";
    elements.replayButton.classList.toggle(
        "hidden",
        state.skipped.length === 0
    );
    elements.skippedList.textContent = "";
    elements.noSkips.classList.toggle("hidden", state.skipped.length > 0);
    state.skipped.forEach((code) => {
        const flag = countries.find((item) => item.code === code);
        const listItem = document.createElement("li");
        listItem.textContent = placeQuiz
            ? flag.name
            : flag.name + " — " + flag.capital;
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

function startGame(questions) {
    const queue = (questions || selectedFlags()).map(
        (question) => question.code
    );
    if (!queue.length) return;
    state.queue = shuffle(queue);
    state.index = 0;
    state.correctFirstTry = 0;
    state.skipped = [];
    state.firstTry = true;
    state.revealed = false;
    state.replaying = Boolean(questions);
    state.screen = "playing";
    saveState();
    render();
}

function replaySkipped() {
    startGame(
        state.skipped.map((code) =>
            countries.find((item) => item.code === code)
        )
    );
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
    const answers =
        state.guessType === "place"
            ? [flag.name].concat(flag.aliases)
            : [flag.capital].concat(flag.capitalAliases || []);
    const correct = answers.some((answer) => normalise(answer) === guess);
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
    state.replaying = false;
    saveState();
    render();
}

elements.continentInputs.forEach((input) =>
    input.addEventListener("change", () => {
        state.selectedContinents = elements.continentInputs
            .filter((item) => item.checked)
            .map((item) => item.value);
        saveState();
        updateStartScreen();
    })
);
elements.guessTypeInputs.forEach((input) =>
    input.addEventListener("change", () => {
        if (!input.checked) return;
        state.guessType = input.value === "capital" ? "capital" : "place";
        if (state.guessType === "place" && state.promptType === "country")
            state.promptType = "flag";
        saveGameMode();
        updateAnswerMode();
        updateStartScreen();
    })
);
elements.promptTypeInputs.forEach((input) =>
    input.addEventListener("change", () => {
        if (
            !input.checked ||
            (state.guessType === "place" && input.value === "country")
        )
            return;
        state.promptType = input.value === "country" ? "country" : "flag";
        saveGameMode();
        updateAnswerMode();
        updateStartScreen();
    })
);
elements.categoryInputs.forEach((input) =>
    input.addEventListener("change", () => {
        state.selectedCategories = elements.categoryInputs
            .filter((item) => item.checked)
            .map((item) => item.value);
        saveCategories();
        updateStartScreen();
    })
);
elements.answerModeInputs.forEach((input) =>
    input.addEventListener("change", () => {
        if (!input.checked) return;
        state.answerMode = input.value === "auto" ? "auto" : "submit";
        saveAnswerMode();
        elements.answerMessage.textContent = "";
        elements.answerMessage.classList.remove(
            "text-rose-700",
            "dark:text-rose-300"
        );
        updateAnswerMode();
    })
);
elements.startButton.addEventListener("click", () => startGame());
elements.answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.revealed) moveNext();
    else if (state.answerMode === "submit") checkAnswer();
});
elements.guessInput.addEventListener("input", () => {
    if (
        state.screen === "playing" &&
        !state.revealed &&
        state.answerMode === "auto"
    )
        checkAnswer();
});
elements.skipButton.addEventListener("click", skipCurrent);
elements.continueButton.addEventListener("click", moveNext);
elements.replayButton.addEventListener("click", replaySkipped);
$("quit-button").addEventListener("click", clearGame);
$("play-again-button").addEventListener("click", () => startGame());
$("change-button").addEventListener("click", clearGame);

document.addEventListener("keydown", (event) => {
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
