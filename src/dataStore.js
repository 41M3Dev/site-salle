const fs = require('fs/promises');
const path = require('path');

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '..', 'data', 'data.json');

// Les salles (src/salles.js) et les classes (src/planning.js) sont des
// listes fixes/dérivées, pas des données mutables : seules les attributions
// (quelle classe est dans quelle salle) sont persistées ici.
const EMPTY_DATA = { attributions: [] };

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(EMPTY_DATA, null, 2));
  }
}

async function readData() {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

async function findAll(collection) {
  const data = await readData();
  return data[collection];
}

async function findById(collection, id) {
  const items = await findAll(collection);
  return items.find((item) => item.id === Number(id));
}

async function insert(collection, fields) {
  if (collection === 'attributions' && !fields.dateDebut) {
    throw new Error('dateDebut est obligatoire pour créer une attribution');
  }
  const data = await readData();
  const item = { id: nextId(data[collection]), ...fields };
  data[collection].push(item);
  await writeData(data);
  return item;
}

async function update(collection, id, changes) {
  const data = await readData();
  const idx = data[collection].findIndex((item) => item.id === Number(id));
  if (idx === -1) return null;
  data[collection][idx] = { ...data[collection][idx], ...changes };
  await writeData(data);
  return data[collection][idx];
}

async function remove(collection, id) {
  const data = await readData();
  const idx = data[collection].findIndex((item) => item.id === Number(id));
  if (idx === -1) return false;
  data[collection].splice(idx, 1);
  await writeData(data);
  return true;
}

// Supprime en une seule écriture toutes les entrées d'une collection qui
// vérifient le prédicat donné (utilisé pour les suppressions en cascade).
async function removeWhere(collection, predicate) {
  const data = await readData();
  const before = data[collection].length;
  data[collection] = data[collection].filter((item) => !predicate(item));
  await writeData(data);
  return before - data[collection].length;
}

module.exports = {
  readData,
  writeData,
  findAll,
  findById,
  insert,
  update,
  remove,
  removeWhere,
};
