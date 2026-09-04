const fs = require('fs');
const path = require('path');

const PLANNING_PATH = path.join(__dirname, '..', 'public', 'planning-ecole.json');

function readPlanning() {
  const raw = fs.readFileSync(PLANNING_PATH, 'utf-8');
  return JSON.parse(raw);
}

function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Les classes de l'appli sont les formations déclarées dans le planning de
// l'école (clés du JSON), pas une liste gérée manuellement en admin.
function getFormations() {
  return Object.keys(readPlanning()).sort((a, b) => a.localeCompare(b));
}

// Formations qui ont cours à la date donnée (par défaut : aujourd'hui), selon
// les dates listées dans public/planning-ecole.json.
function getFormationsAvecCoursAujourdhui(date = new Date()) {
  const planning = readPlanning();
  const iso = todayISO(date);
  return Object.keys(planning)
    .filter((nom) => planning[nom].includes(iso))
    .sort((a, b) => a.localeCompare(b));
}

module.exports = { getFormations, getFormationsAvecCoursAujourdhui };
