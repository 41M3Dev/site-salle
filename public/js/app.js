const JOURS_LABELS = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
};

const JS_DAY_TO_JOUR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const select = document.getElementById('classe-select');
const resultCard = document.getElementById('result-card');
const resultContent = document.getElementById('result-content');
const errorCard = document.getElementById('error-card');
const errorText = document.getElementById('error-text');

function showError(message) {
  errorText.textContent = message;
  errorCard.hidden = false;
  resultCard.hidden = true;
}

function hideError() {
  errorCard.hidden = true;
}

async function loadClasses() {
  try {
    const res = await fetch('/api/classes');
    if (!res.ok) throw new Error('Erreur de chargement des classes');
    const classes = await res.json();

    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = classes.length ? '-- Choisis ta classe --' : "Aucune classe n'a cours aujourd'hui";
    select.appendChild(placeholder);

    classes.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nom;
      select.appendChild(opt);
    });

    const remembered = localStorage.getItem('classeId');
    if (remembered && classes.some((c) => String(c.id) === remembered)) {
      select.value = remembered;
      loadSalle(remembered);
    }
  } catch (err) {
    showError('Impossible de charger la liste des classes.');
  }
}

async function loadSalle(classeId) {
  hideError();
  if (!classeId) {
    resultCard.hidden = true;
    return;
  }

  localStorage.setItem('classeId', classeId);

  try {
    const res = await fetch(`/api/classes/${encodeURIComponent(classeId)}/salle`);
    if (!res.ok) throw new Error('Erreur');
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    showError('Impossible de récupérer la salle pour cette classe.');
  }
}

function renderResult(data) {
  resultCard.hidden = false;

  if (data.uniforme) {
    resultContent.innerHTML = data.salle
      ? `
        <p class="muted">${escapeHtml(data.classe)}</p>
        <div class="salle-nom">${escapeHtml(data.salle)}</div>
        <p class="hint">Toute la semaine</p>
      `
      : `
        <p class="muted">${escapeHtml(data.classe)}</p>
        <p class="hint">Aucune salle attribuée pour le moment.</p>
      `;
    return;
  }

  const today = JS_DAY_TO_JOUR[new Date().getDay()];
  const rows = data.parJour.map((j) => `
    <tr class="${j.jour === today ? 'today' : ''}">
      <td>${JOURS_LABELS[j.jour]}</td>
      <td>${j.salle ? escapeHtml(j.salle) : '<span class="muted">—</span>'}</td>
    </tr>
  `).join('');

  resultContent.innerHTML = `
    <p class="muted">${escapeHtml(data.classe)}</p>
    <p class="hint" style="margin-bottom: 4px;">Salle selon le jour</p>
    <table>
      <thead><tr><th>Jour</th><th>Salle</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

select.addEventListener('change', (e) => loadSalle(e.target.value));

loadClasses();
