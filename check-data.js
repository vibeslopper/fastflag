const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const countries = vm.runInNewContext(source + "\ncountries", {});
const categories = ["countries", "territories"];
const continents = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
  "Other"
];
const categoryTotals = { countries: 0, territories: 0 };
const continentTotals = {};
continents.forEach(function (continent) {
  continentTotals[continent] = 0;
});
const seen = new Set();
const duplicates = [];
const invalidCodes = [];
const invalidCategories = [];
const missingCapitals = [];
const invalidCapitalAliases = [];
const invalidContinents = [];
const missingFlags = [];
let problems = 0;

countries.forEach(function (flag) {
  if (seen.has(flag.code)) {
    duplicates.push(flag.code);
  }
  seen.add(flag.code);

  if (!/^[a-z]+(?:-[a-z]+)*$/.test(flag.code)) {
    invalidCodes.push(flag.code);
  }

  const flagPath = path.join(__dirname, "data", "flags", "4x3", flag.code + ".svg");
  if (!fs.existsSync(flagPath)) {
    missingFlags.push(flag.code);
  }

  if (categories.indexOf(flag.category) === -1) {
    invalidCategories.push(flag.code + ": " + flag.category);
  } else {
    categoryTotals[flag.category] += 1;
  }
  if (flag.category === "countries" && (typeof flag.capital !== "string" || !flag.capital.trim())) {
    missingCapitals.push(flag.code);
  }
  if (flag.capitalAliases !== undefined && (!Array.isArray(flag.capitalAliases) ||
      flag.capitalAliases.some(function (alias) { return typeof alias !== "string" || !alias.trim(); }))) {
    invalidCapitalAliases.push(flag.code);
  }
  if (continents.indexOf(flag.continent) === -1) {
    invalidContinents.push(flag.code + ": " + flag.continent);
  } else {
    continentTotals[flag.continent] += 1;
  }
});

console.log("Duplicate codes: " + (duplicates.join(", ") || "none"));
console.log("Invalid codes: " + (invalidCodes.join(", ") || "none"));
console.log("Missing flags: " + (missingFlags.join(", ") || "none"));
console.log("Invalid categories: " + (invalidCategories.join(", ") || "none"));
console.log("Invalid continents: " + (invalidContinents.join(", ") || "none"));
console.log("Countries missing capitals: " + (missingCapitals.join(", ") || "none"));
console.log("Invalid capital aliases: " + (invalidCapitalAliases.join(", ") || "none"));
Object.keys(categoryTotals).sort().forEach(function (category) {
  console.log("Category " + category + ": " + categoryTotals[category]);
});
Object.keys(continentTotals).sort().forEach(function (continent) {
  console.log("Continent " + continent + ": " + continentTotals[continent]);
});
console.log("Total flags: " + countries.length);
problems += duplicates.length + invalidCodes.length + invalidCategories.length + missingCapitals.length +
  invalidCapitalAliases.length + invalidContinents.length + missingFlags.length;
if (categoryTotals.countries !== 197) {
  console.error("Expected 197 country flags.");
  problems += 1;
}
if (problems) process.exitCode = 1;
