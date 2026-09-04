const store = require('./dataStore');
const { JOURS } = require('./jours');

const JOUR_BY_JS_DAY = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Weekend -> null (pas de cours, donc pas de jour de surcharge applicable).
function jourFromDate(date) {
  const jour = JOUR_BY_JS_DAY[date.getDay()];
  return JOURS.includes(jour) ? jour : null;
}

// Parmi des attributions déjà réduites à un seul (classeId, jourSemaine),
// retient celle entrée en vigueur le plus récemment (dateDebut <= référence).
function derniereEnVigueur(attributions, dateRefISO) {
  return attributions
    .filter((a) => a.dateDebut <= dateRefISO)
    .sort((a, b) => (a.dateDebut < b.dateDebut ? 1 : a.dateDebut > b.dateDebut ? -1 : 0))[0] || null;
}

// Résout l'attribution en vigueur pour une classe à une date de référence,
// pour un jour de semaine donné (ou null pour le défaut "toute la semaine").
// Une surcharge de jour en vigueur prime toujours sur le défaut en vigueur.
// Fonction pure : à utiliser partout où la salle d'une classe doit être
// déterminée, plutôt que de dupliquer le filtrage des attributions.
function resolveAttributionPourJour(attributions, classeId, dateRefISO, jour) {
  const classeAttributions = attributions.filter((a) => a.classeId === classeId);

  if (jour) {
    const surcharge = derniereEnVigueur(
      classeAttributions.filter((a) => a.jourSemaine === jour),
      dateRefISO
    );
    if (surcharge) return surcharge;
  }

  return derniereEnVigueur(
    classeAttributions.filter((a) => a.jourSemaine === null),
    dateRefISO
  );
}

// Salle actuellement en vigueur pour une classe à une date donnée (par
// défaut : maintenant). Ne renvoie jamais une attribution programmée pour
// le futur.
async function resolveSalleActuelle(classeId, date = new Date()) {
  const attributions = await store.findAll('attributions');
  return resolveAttributionPourJour(attributions, classeId, todayISO(date), jourFromDate(date));
}

// Résolution jour par jour (lundi..vendredi), en vigueur à la date de
// référence donnée (par défaut aujourd'hui) — pour l'affichage de la
// semaine complète (page publique, détail admin).
async function resolveSallePourSemaine(classeId, date = new Date()) {
  const attributions = await store.findAll('attributions');
  const dateRefISO = todayISO(date);
  return JOURS.map((jour) => ({
    jour,
    attribution: resolveAttributionPourJour(attributions, classeId, dateRefISO, jour),
  }));
}

module.exports = {
  todayISO,
  jourFromDate,
  resolveAttributionPourJour,
  resolveSalleActuelle,
  resolveSallePourSemaine,
};
