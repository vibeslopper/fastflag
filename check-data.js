const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const countries = vm.runInNewContext(source + "\ncountries", {});
const seen = new Set();
const totals = {};
const duplicates = [];
const missingFlags = [];
let problems = 0;

countries.forEach(function (country) {
  if (seen.has(country.code)) {
    duplicates.push(country.code);
  }
  seen.add(country.code);

  const flag = path.join(__dirname, "data", "flags", "4x3", country.code + ".svg");
  if (!fs.existsSync(flag)) {
    missingFlags.push(country.code);
  }
  totals[country.continent] = (totals[country.continent] || 0) + 1;
});

console.log("Duplicate codes: " + (duplicates.join(", ") || "none"));
console.log("Missing flags: " + (missingFlags.join(", ") || "none"));
Object.keys(totals).sort().forEach(function (continent) {
  console.log(continent + ": " + totals[continent]);
});
console.log("Total: " + countries.length);
problems += duplicates.length + missingFlags.length;
if (countries.length !== 197) {
  console.error("Expected 197 countries.");
  problems += 1;
}
if (problems) process.exitCode = 1;
