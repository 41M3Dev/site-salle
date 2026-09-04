const JOURS_LABELS = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
};

let state = {
  salles: [],
  classes: [],
};

// ---------- helpers ----------

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    showLogin();
    throw new Error('Non authentifié');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erreur inconnue');
  }
  return data;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function showLogin() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('admin-view').hidden = true;
}

function showAdmin() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('admin-view').hidden = false;
  initAdmin();
}

// ---------- auth ----------

async function checkAuth() {
  const { isAdmin } = await api('/api/auth/check');
  if (isAdmin) showAdmin();
  else showLogin();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
    document.getElementById('password').value = '';
    showAdmin();
  } catch (err) {
    errorEl.textContent = 'Mot de passe incorrect';
    errorEl.hidden = false;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  showLogin();
});

// ---------- tabs ----------

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('main > section').forEach((s) => (s.hidden = true));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
  });
});

// ---------- init ----------

let adminInitDone = false;
async function initAdmin() {
  if (adminInitDone) {
    refreshAll();
    return;
  }
  adminInitDone = true;
  await refreshAll();
}

async function refreshAll() {
  await Promise.all([loadSalles(), loadClasses()]);
  await loadAttribClasseOptions();
}

// ---------- Salles ----------
// Liste fixe (A, B, D, E, Studio), chargée uniquement pour peupler les
// listes déroulantes des attributions.

async function loadSalles() {
  state.salles = await api('/api/admin/salles');
}

// ---------- Classes ----------
// Dérivées du planning de l'école, affichées en lecture seule.

async function loadClasses() {
  state.classes = await api('/api/admin/classes');
  renderClasses();
}

function renderClasses() {
  const container = document.getElementById('classes-list');
  if (state.classes.length === 0) {
    container.innerHTML = '<p class="muted">Aucune classe trouvée dans le planning.</p>';
    return;
  }
  container.innerHTML = state.classes.map((c) => `
    <div class="list-item">
      <div class="info">
        <div class="name">${escapeHtml(c.nom)}</div>
        <div class="muted">
          ${c.salleParDefaut ? `Défaut : ${escapeHtml(c.salleParDefaut)}` : 'Pas de salle par défaut'}
          ${c.nbSurcharges ? ` · <span class="badge">${c.nbSurcharges} surcharge(s)</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ---------- Attributions ----------

const attribClasseSelect = document.getElementById('attrib-classe-select');
const attribDetail = document.getElementById('attrib-detail');
const attribJourSelect = document.getElementById('attrib-jour-select');
const attribSalleSelect = document.getElementById('attrib-salle-select');

async function loadAttribClasseOptions() {
  const current = attribClasseSelect.value;
  attribClasseSelect.innerHTML = '<option value="">-- Choisir une classe --</option>' +
    state.classes.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nom)}</option>`).join('');
  if (current && state.classes.some((c) => String(c.id) === current)) {
    attribClasseSelect.value = current;
  }
  await loadAttribSalleOptions();
  await loadAttribDetail();
}

async function loadAttribSalleOptions() {
  const options = state.salles.map((s) => `<option value="${s.id}">${escapeHtml(s.nom)}</option>`).join('');
  attribSalleSelect.innerHTML = options || '<option value="">Aucune salle</option>';
  attribJourSelect.innerHTML = '<option value="">Toute la semaine</option>' +
    Object.entries(JOURS_LABELS).map(([val, label]) => `<option value="${val}">${label}</option>`).join('');
}

attribClasseSelect.addEventListener('change', loadAttribDetail);

async function loadAttribDetail() {
  const classeId = attribClasseSelect.value;
  if (!classeId) {
    attribDetail.hidden = true;
    return;
  }
  attribDetail.hidden = false;

  const data = await api(`/api/admin/classes/${encodeURIComponent(classeId)}/attributions`);
  renderAttribList(data.defaut, data.surcharges);
}

function renderAttribList(defaut, surcharges) {
  const container = document.getElementById('attrib-list');
  const rows = [];

  rows.push(`
    <div class="list-item">
      <div class="info">
        <span class="badge">Toute la semaine</span>
        <span style="margin-left:8px;">${defaut ? escapeHtml(defaut.salle) : '<span class="muted">Aucune salle par défaut</span>'}</span>
      </div>
      ${defaut ? `<div class="actions"><button class="danger" onclick="deleteAttribution('')">Retirer</button></div>` : ''}
    </div>
  `);

  (surcharges || []).forEach((s) => {
    rows.push(`
      <div class="list-item">
        <div class="info">
          <span class="badge">${JOURS_LABELS[s.jour]}</span>
          <span style="margin-left:8px;">${escapeHtml(s.salle)}</span>
        </div>
        <div class="actions">
          <button class="danger" onclick="deleteAttribution('${s.jour}')">Retirer</button>
        </div>
      </div>
    `);
  });

  container.innerHTML = rows.join('');
}

document.getElementById('attrib-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const classeId = attribClasseSelect.value;
  if (!classeId) return;
  await api(`/api/admin/classes/${encodeURIComponent(classeId)}/attribution`, {
    method: 'PUT',
    body: JSON.stringify({
      salle_id: attribSalleSelect.value,
      jour_semaine: attribJourSelect.value || null,
    }),
  });
  await loadAttribDetail();
  await loadClasses();
});

window.deleteAttribution = async (jour) => {
  const classeId = attribClasseSelect.value;
  if (!classeId) return;
  await api(`/api/admin/classes/${encodeURIComponent(classeId)}/attribution?jour=${jour}`, { method: 'DELETE' });
  await loadAttribDetail();
  await loadClasses();
};

// ---------- boot ----------

checkAuth();
