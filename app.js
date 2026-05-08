// ═══════════════════════════════════════════════════
//  ÉTAT GLOBAL
// ═══════════════════════════════════════════════════
let state = {
  classe: '', nom: '', prenom: '', mdp: '', isFirstLogin: false,
  vma: null,
  projet: '',
  seances: {},
  config: {},
  // Séance en cours
  seance: null,   // {num, projet, def, sequences, seqIndex, phase, ressenti, ...}
  chrono: null,   // {interval, remaining, isRunning}
};

// ═══════════════════════════════════════════════════
//  UTILITAIRES DOM
// ═══════════════════════════════════════════════════
const $ = id => document.getElementById(id);

let _toastTimer;
function toast(msg, type) {
  const t = $('toast');
  t.innerHTML  = msg;
  t.className  = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warn' : '');
  clearTimeout(_toastTimer);
  setTimeout(() => t.classList.add('show'), 10);
  _toastTimer = setTimeout(() => t.classList.remove('show'), type === 'warn' ? 6000 : 3000);
}

function loading(show, msg) {
  $('loading').classList.toggle('hidden', !show);
  const m = $('loading-msg');
  if (msg)   { m.innerHTML = msg; m.style.display = 'block'; }
  else       { m.style.display = 'none'; m.innerHTML = ''; }
}

function showAccesBloque(msg) {
  loading(false);
  $('msg-bloque').textContent = msg || 'Application temporairement indisponible.';
  $('acces-bloque').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
//  API
// ═══════════════════════════════════════════════════
function fetchWithTimeout(url, ms) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function api(params) {
  const url = WEBAPP + '?' + new URLSearchParams(params);
  const r   = await fetchWithTimeout(url, 15000);
  return r.json();
}

// ═══════════════════════════════════════════════════
//  NAVIGATION SPA
// ═══════════════════════════════════════════════════
const PAGES = ['accueil', 'projet', 'seance', 'progression', 'lexique', 'tuto'];
let _currentPage = 'accueil';

function showPage(name) {
  if (!PAGES.includes(name)) return;

  // Arrêter le chrono si on quitte la séance
  if (_currentPage === 'seance' && name !== 'seance') {
    // On laisse le chrono tourner en fond — pas d'arrêt
  }

  PAGES.forEach(p => {
    const el = $('page-' + p);
    if (el) el.style.display = p === name ? '' : 'none';
  });

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === name);
  });

  _currentPage = name;

  // Rendu dynamique
  if (name === 'accueil')      renderAccueil();
  if (name === 'projet')       renderProjet();
  if (name === 'seance')       renderSeancePage();
  if (name === 'progression')  renderProgression();
  if (name === 'lexique')      renderLexique();
  if (name === 'tuto')         renderTuto();
}

function showTutoLogin() {
  // Affiche le tuto depuis la page de connexion (non implémenté comme page séparée)
  alert('Connectez-vous d\'abord pour accéder au tutoriel.');
}

// ═══════════════════════════════════════════════════
//  PERSISTANCE LOGIN
// ═══════════════════════════════════════════════════
const LOGIN_KEY   = 'course_login';
const PREFILL_KEY = 'course_prefill';

function getSavedLogin()    { try { return JSON.parse(localStorage.getItem(LOGIN_KEY))   || null; } catch (_) { return null; } }
function getPrefill()       { try { return JSON.parse(localStorage.getItem(PREFILL_KEY)) || null; } catch (_) { return null; } }
function saveLogin(o)       { localStorage.setItem(LOGIN_KEY, JSON.stringify(o)); }
function savePrefill(o)     { localStorage.setItem(PREFILL_KEY, JSON.stringify(o)); }
function clearLogin()       { localStorage.removeItem(LOGIN_KEY); }

// ═══════════════════════════════════════════════════
//  INIT CONNEXION
// ═══════════════════════════════════════════════════
let _initRunning = false;
async function initLogin() {
  if (_initRunning) return;
  _initRunning = true;
  $('loading-retry').style.display = 'none';
  $('loading-spinner').style.display = '';
  loading(true);

  try {
    const d = await api({ action: 'getClasses' });
    const classes = d.classes || [];
    const sel = $('sel-classe');
    sel.innerHTML = '<option value="">— Choisir —</option>';
    classes.forEach(c => {
      const o = document.createElement('option');
      o.value = o.textContent = c;
      sel.appendChild(o);
    });

    const saved = getSavedLogin();
    if (saved && classes.includes(saved.classe)) {
      loading(false);
      const ok = await autoConnect(saved, classes);
      if (!ok) await prefillForm(getPrefill(), classes);
      _initRunning = false;
      return;
    }
    await prefillForm(getPrefill(), classes);
  } catch (_) {
    loading(true, 'Impossible de joindre le serveur.<br>Vérifiez votre connexion.');
    $('loading-spinner').style.display = 'none';
    $('loading-retry').style.display = '';
    _initRunning = false;
    return;
  }
  _initRunning = false;
  loading(false);
}

async function autoConnect(saved, classes) {
  if (!classes.includes(saved.classe)) return false;
  loading(true);
  try {
    const d = await api({ action: 'login', classe: saved.classe, nom: saved.nom, prenom: saved.prenom, mdp: saved.mdp });
    if (d.error || d.mdp !== saved.mdp) { clearLogin(); loading(false); return false; }
    applyLoginData(saved.classe, saved.nom, saved.prenom, saved.mdp, d);
    enterApp();
    return true;
  } catch (_) {}
  loading(false);
  return false;
}

async function prefillForm(data, classes) {
  if (!data || !classes.includes(data.classe)) return;
  $('sel-classe').value = data.classe;
  loading(true);
  try {
    const d = await api({ action: 'getEleves', classe: data.classe });
    populateEleves(d.eleves || []);
    for (const opt of $('sel-eleve').options) {
      if (!opt.value) continue;
      const e = JSON.parse(opt.value);
      if (e.nom === data.nom && e.prenom === data.prenom) {
        $('sel-eleve').value = opt.value;
        showMdpField(e.hasMdp);
        break;
      }
    }
  } catch (_) {}
  loading(false);
}

// ─── Formulaire connexion ────────────────────────────────────
$('sel-classe').addEventListener('change', async function () {
  const classe = this.value;
  $('sel-eleve').innerHTML = '<option value="">— Choisir —</option>';
  $('sel-eleve').disabled  = true;
  $('zone-mdp').style.display = 'none';
  $('btn-login').disabled  = true;
  if (!classe) return;
  loading(true);
  try {
    const d = await api({ action: 'getEleves', classe });
    populateEleves(d.eleves || []);
  } catch (_) { toast('Erreur de chargement des élèves', 'error'); }
  loading(false);
});

function populateEleves(eleves) {
  const sel = $('sel-eleve');
  sel.innerHTML = '<option value="">— Choisir —</option>';
  eleves.forEach(e => {
    const o = document.createElement('option');
    o.value       = JSON.stringify(e);
    o.textContent = e.nom + ' ' + e.prenom;
    sel.appendChild(o);
  });
  sel.disabled = false;
}

$('sel-eleve').addEventListener('change', function () {
  $('btn-login').disabled = true;
  $('zone-mdp').style.display = 'none';
  if (!this.value) return;
  const e = JSON.parse(this.value);
  showMdpField(e.hasMdp);
});

function showMdpField(hasMdp) {
  $('zone-mdp').style.display = 'block';
  $('inp-mdp').value  = '';
  $('err-mdp').style.display  = 'none';
  $('err-mdp2').style.display = 'none';

  if (hasMdp) {
    $('mdp-label').textContent         = 'Mon mot de passe';
    $('mdp-rules').style.display       = 'none';
    $('zone-mdp2').style.display       = 'none';
  } else {
    $('mdp-label').textContent         = 'Créer mon mot de passe';
    $('mdp-rules').style.display       = 'block';
    $('zone-mdp2').style.display       = 'block';
    $('inp-mdp2').value = '';
  }
  $('btn-login').disabled = false;
  setTimeout(() => $('inp-mdp').focus(), 100);
}

$('inp-mdp').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
$('inp-mdp2').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('btn-login').addEventListener('click',  doLogin);

async function doLogin() {
  if (!$('sel-eleve').value) return;
  const eleve   = JSON.parse($('sel-eleve').value);
  const classe  = $('sel-classe').value;
  const mdp     = $('inp-mdp').value.trim();
  $('err-mdp').style.display  = 'none';
  $('err-mdp2').style.display = 'none';

  // Validation mdp
  if (!validateMdp(mdp)) {
    $('err-mdp').textContent = '6 à 10 lettres minuscules sans accent.';
    $('err-mdp').style.display = 'block';
    return;
  }

  // Si première connexion : vérifier confirmation
  if (!eleve.hasMdp) {
    const mdp2 = $('inp-mdp2').value.trim();
    if (mdp !== mdp2) {
      $('err-mdp2').style.display = 'block';
      return;
    }
  }

  loading(true);
  try {
    const d = await api({ action: 'login', classe, nom: eleve.nom, prenom: eleve.prenom, mdp });
    if (d.error) {
      $('err-mdp').textContent   = d.error;
      $('err-mdp').style.display = 'block';
      loading(false);
      return;
    }
    applyLoginData(classe, eleve.nom, eleve.prenom, mdp, d);
    savePrefill({ classe, nom: eleve.nom, prenom: eleve.prenom });
    saveLogin({ classe, nom: eleve.nom, prenom: eleve.prenom, mdp });
    enterApp();
  } catch (_) {
    toast('Erreur de connexion. Réessayez.', 'error');
    loading(false);
  }
}

function validateMdp(v) { return /^[a-z]{6,10}$/.test(v); }

function applyLoginData(classe, nom, prenom, mdp, d) {
  state.classe  = classe;
  state.nom     = nom;
  state.prenom  = prenom;
  state.mdp     = mdp;
  state.isFirstLogin = d.isFirstLogin || false;
  state.vma     = d.vma    || null;
  state.projet  = d.projet || '';
  state.seances = d.seances || {};
  state.config  = d.config  || {};
}

function enterApp() {
  // Vérifier accès bloqué
  if (state.config.acces_bloque && state.config.message_bloque) {
    showAccesBloque(state.config.message_bloque);
    return;
  }

  $('screen-login').classList.remove('active');
  $('screen-app').classList.add('active');
  loading(false);
  updateTopbar();
  showPage('accueil');

  // Navigation bas d'écran
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => showPage(btn.dataset.page);
  });

  // Déconnexion
  $('btn-logout').onclick = logout;
}

function updateTopbar() {
  $('tb-prenom').textContent = state.prenom.toUpperCase();
  const pInfo = state.projet ? PROJETS_INFO[parseInt(state.projet)] : null;
  $('tb-projet-label').textContent = pInfo ? 'Projet ' + state.projet : '';
  const next = nextSeanceNum(state.seances, state.config.nb_seances_cycle || 6);
  $('tb-seance-label').textContent = next ? ' · S' + next : '';
}

function logout() {
  stopChrono();
  clearLogin();
  state = { classe:'', nom:'', prenom:'', mdp:'', isFirstLogin:false, vma:null, projet:'', seances:{}, config:{}, seance:null, chrono:null };
  $('screen-app').classList.remove('active');
  $('screen-login').classList.add('active');
  $('sel-classe').value = '';
  $('sel-eleve').innerHTML = '<option value="">— Choisir ma classe d\'abord —</option>';
  $('sel-eleve').disabled = true;
  $('zone-mdp').style.display = 'none';
  $('btn-login').disabled = true;
}

// ═══════════════════════════════════════════════════
//  PAGE ACCUEIL
// ═══════════════════════════════════════════════════
function renderAccueil() {
  const el  = $('page-accueil');
  const nb  = state.config.nb_seances_cycle || 6;
  const next = nextSeanceNum(state.seances, nb);

  // Pas de VMA → Demi-Cooper
  if (!state.vma) {
    el.innerHTML = renderCooperSection();
    setupCooperListeners();
    return;
  }

  // VMA mais pas de projet → choisir projet
  if (!state.projet) {
    el.innerHTML = renderProjetChoiceSection(state.vma, null);
    setupProjetChoiceListeners(null);
    return;
  }

  const p    = parseInt(state.projet);
  const pInfo = PROJETS_INFO[p];
  const dernS = lastSeance();
  const html  = [];

  // Hero
  html.push(`<div class="dashboard-hero">
    <div class="dashboard-hero-name">Projet ${p}</div>
    <div class="dashboard-hero-projet">${pInfo.nom}</div>
    <div class="hero-divider"></div>
    <div class="dashboard-hero-vma"><span class="dashboard-hero-vma-label">VMA</span><span class="dashboard-hero-vma-arrow"> → </span><span class="dashboard-hero-vma-val">${state.vma}</span><span class="dashboard-hero-vma-unit"> KM/H</span></div>`);

  if (dernS) {
    html.push(`<div class="hero-divider"></div>
    <div class="dashboard-badge-row">
      <div class="dashboard-badge-emoji">${badgeEmoji(dernS.badge)}</div>
      <div class="dashboard-badge-info">
        <div class="dashboard-badge-label">Dernière séance · S${lastSeanceNum()}</div>
        <div class="dashboard-badge-name" style="color:${badgeColor(dernS.badge)}">${dernS.badge}</div>
      </div>
    </div>`);
  }
  html.push('</div>');

  // Stats
  const nbDone = Object.keys(state.seances).filter(k => state.seances[k]).length;
  html.push(`<div class="stat-grid"><div class="stat-card stat-card-full"><div class="stat-card-val">${nbDone}/${nb}</div><div class="stat-card-key">Séances effectuées</div></div></div>`);

  if (!next) {
    // Cycle terminé
    html.push(`<div class="cycle-done-card">
      <div style="font-size:2rem;margin-bottom:.5rem">🏆</div>
      <div class="cta-card-title">Cycle terminé !</div>
      <div class="cta-card-sub">Félicitations ! Vous avez complété les ${nb} séances de votre cycle.</div>
    </div>`);
    html.push(renderBadgeSummary());
  } else {
    // Prochaine séance
    const def = SEANCES_PROJETS[p][next - 1];
    const descSeance = p === 3 ? descSeanceP3(def) : descSeanceP12(p, def);
    html.push(`<div class="cta-card">
      <div class="cta-card-title">Prochaine séance : S${next}</div>
      <div class="cta-card-sub">${descSeance}</div>
      <button class="btn" id="btn-demarrer-seance">Commencer la séance S${next}</button>
    </div>`);
    html.push(renderBadgeSummary());
    html.push(`<button class="btn btn-outline" id="btn-changer-projet" style="margin-bottom:.75rem">Changer de projet</button>`);
  }

  el.innerHTML = html.join('');

  const bs = $('btn-demarrer-seance');
  if (bs) bs.onclick = () => { showPage('seance'); };

  const cp = $('btn-changer-projet');
  if (cp) cp.onclick = () => showChangerProjet();
}

function lastSeance() {
  const nb = state.config.nb_seances_cycle || 6;
  for (let i = nb; i >= 1; i--) {
    if (state.seances['S' + i]) return state.seances['S' + i];
  }
  return null;
}
function lastSeanceNum() {
  const nb = state.config.nb_seances_cycle || 6;
  for (let i = nb; i >= 1; i--) {
    if (state.seances['S' + i]) return i;
  }
  return 0;
}

function descSeanceP12(projet, def) {
  const pct = projet === 1 ? '70–75 %' : '90–95 %';
  const r = def.recupSec ? ` — récupération ${fmtDureeLabel(def.recupSec)}` : ' continu';
  return `${def.nbSeq} × ${fmtDureeLabel(def.dureeSec)}${r} · ${pct} VMA`;
}
function descSeanceP3(def) {
  if (def.libre) return '30 minutes libres — le moins de marche possible';
  const c = def.cycles[0], m = def.cycles[1];
  return `${fmtDureeLabel(c.duree)} course / ${fmtDureeLabel(m.duree)} marche × ${def.nb} (30 min)`;
}

function renderBadgeSummary() {
  const nb = state.config.nb_seances_cycle || 6;
  const badgeMap = { Or: 0, Argent: 0, Bronze: 0, Carton: 0 };
  for (let i = 1; i <= nb; i++) {
    const s = state.seances['S' + i];
    if (s && s.badge && badgeMap[s.badge] !== undefined) badgeMap[s.badge]++;
  }
  const total = Object.values(badgeMap).reduce((a, b) => a + b, 0);
  if (!total) return '';
  return `<div class="card" style="margin-bottom:.75rem">
    <div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem">Mes badges du cycle</div>
    <div style="display:flex;gap:.75rem;justify-content:center">
      ${['Or','Argent','Bronze','Carton'].map(b => badgeMap[b] > 0 ? `<div style="text-align:center"><div style="font-size:1.8rem">${badgeEmoji(b)}</div><div style="font-size:.75rem;color:var(--muted)">${badgeMap[b]}</div></div>` : '').join('')}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════
//  DEMI-COOPER
// ═══════════════════════════════════════════════════
function renderCooperSection() {
  return `<div>
    <div class="cta-card" style="margin-bottom:1rem">
      <div class="cta-card-title">🏃 Test Demi-Cooper</div>
      <div class="cta-card-sub">Pour commencer, effectuez le test Demi-Cooper : courez le plus loin possible pendant <strong>6 minutes</strong>. Saisissez ensuite la distance parcourue pour calculer votre VMA et choisir votre projet.</div>
    </div>
    <div class="cooper-info">
      ℹ️ Utilisez une application GPS (Google Fit, Strava, Running...) ou mesurez la distance sur une piste d'athlétisme. La précision est importante pour calibrer votre entraînement.
    </div>
    <div class="card">
      <div class="field">
        <label class="field-label">Distance parcourue</label>
        <div style="display:flex;align-items:center;gap:.75rem">
          <input type="number" id="inp-cooper-dist" placeholder="ex : 1350" min="100" max="4000" style="font-size:1.5rem;font-family:'Bebas Neue',sans-serif;text-align:center">
          <span style="font-size:.85rem;color:var(--muted);font-weight:600;white-space:nowrap">mètres</span>
        </div>
      </div>
      <button class="btn" id="btn-calc-cooper">Calculer ma VMA</button>
    </div>
    <div class="vma-result" id="vma-result">
      <div class="vma-result-label">Votre VMA estimée</div>
      <div class="vma-result-val" id="vma-result-val">—</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">km/h</div>
    </div>
    <div id="projet-choice-section" style="display:none"></div>
  </div>`;
}

function setupCooperListeners() {
  $('btn-calc-cooper').onclick = () => {
    const dist = parseInt($('inp-cooper-dist').value);
    if (!dist || dist < 100 || dist > 4000) {
      toast('Saisissez une distance entre 100 et 4000 m.', 'error');
      return;
    }
    const vma = calcVMA(dist);
    $('vma-result-val').textContent = vma;
    $('vma-result').style.display   = 'block';

    const suggested = suggestProjet(vma);
    const section   = $('projet-choice-section');
    section.style.display = 'block';
    section.innerHTML = `<div class="section-title">Choisir mon projet</div>` +
      renderProjetChoiceSection(vma, suggested);

    // Scroll vers les cartes projet
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    setupProjetChoiceListeners(suggested, vma);
  };
  $('inp-cooper-dist').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('btn-calc-cooper').click();
  });
}

function renderProjetChoiceSection(vma, suggested) {
  const html = [];
  [1, 2, 3].forEach(p => {
    const info = PROJETS_INFO[p];
    const isSuggested = suggested && p === suggested;
    html.push(`<div class="projet-choice-card p${p}" data-projet="${p}">
      ${isSuggested ? `<div class="suggest-badge">✓ Recommandé pour votre VMA</div>` : ''}
      <div class="projet-choice-num p${p}">Projet ${p}</div>
      <div class="projet-choice-nom">${info.nom}</div>
      <div class="projet-choice-int">${info.icon} ${info.intensite}</div>
      <div class="projet-choice-desc">${info.description.substring(0, 120)}…</div>
    </div>`);
  });
  html.push(`<button class="btn" id="btn-valider-projet" disabled>Valider mon choix</button>`);
  return html.join('');
}

function setupProjetChoiceListeners(suggested, vmaOverride) {
  let selected = null;
  document.querySelectorAll('.projet-choice-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.projet-choice-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selected = parseInt(card.dataset.projet);
      const btn = $('btn-valider-projet');
      if (btn) btn.disabled = false;
    };
  });
  if (suggested) {
    const defCard = document.querySelector(`.projet-choice-card[data-projet="${suggested}"]`);
    if (defCard) { defCard.classList.add('selected'); selected = suggested; }
    const btn = $('btn-valider-projet');
    if (btn) btn.disabled = false;
  }

  const btnVal = $('btn-valider-projet');
  if (btnVal) btnVal.onclick = async () => {
    if (!selected) return;
    const vmaToSave = vmaOverride || state.vma;
    loading(true);
    try {
      await api({ action: 'saveVMA', classe: state.classe, nom: state.nom, prenom: state.prenom, mdp: state.mdp, vma: vmaToSave, projet: selected });
      state.vma    = vmaToSave;
      state.projet = String(selected);
      saveLogin({ classe: state.classe, nom: state.nom, prenom: state.prenom, mdp: state.mdp });
      updateTopbar();
      toast('VMA et projet enregistrés !');
    } catch (_) { toast('Erreur d\'enregistrement', 'error'); }
    loading(false);
    renderAccueil();
  };
}

// ═══════════════════════════════════════════════════
//  CHANGER DE PROJET
// ═══════════════════════════════════════════════════
function showChangerProjet() {
  showModal(
    'Changer de projet ?',
    'Votre historique de séances sera conservé, mais votre nouveau projet démarrera depuis la séance 1.',
    'Changer',
    () => {
      const el = $('page-accueil');
      el.innerHTML = `<div class="section-title">Choisir un nouveau projet</div>` +
        renderProjetChoiceSection(state.vma, parseInt(state.projet));
      setupProjetChoiceListeners(parseInt(state.projet));
    }
  );
}

// ═══════════════════════════════════════════════════
//  PAGE MON PROJET
// ═══════════════════════════════════════════════════
function renderProjet() {
  const el = $('page-projet');
  if (!state.projet) {
    el.innerHTML = `<div class="no-data-msg">Vous n'avez pas encore choisi de projet.<br>Effectuez d'abord le test Demi-Cooper depuis l'accueil.</div>`;
    return;
  }

  const p    = parseInt(state.projet);
  const info = PROJETS_INFO[p];
  const headerClass = p === 1 ? 'blue' : p === 2 ? 'orange' : 'green';

  el.innerHTML = `
    <div class="projet-fiche">
      <div class="fiche-header ${headerClass}">
        <h2>${info.icon} Projet ${p}</h2>
        <p>${info.nom} · ${info.intensite}</p>
      </div>
      <div class="fiche-body">
        <div class="fiche-desc">${info.description.replace(/\. /g, '.<br><br>')}</div>
        <div class="section-title">Bénéfices</div>
        <ul class="fiche-benefices">
          ${info.benefices.map(b => `<li>${b}</li>`).join('')}
        </ul>
        <div class="section-title">Structure des 6 séances</div>
        <ul class="structure-list">
          ${info.structure.map((s, i) => `<li><span class="structure-seance-num">S${i+1}</span>${s.replace(/^S\d+ : /, '')}</li>`).join('')}
        </ul>
      </div>
    </div>
    <div style="font-size:.75rem;color:var(--muted);text-align:center;line-height:1.6">
      VMA : <strong>${state.vma} km/h</strong><br>
      Toutes les distances cibles sont calculées à partir de votre VMA.
    </div>`;
}

// ═══════════════════════════════════════════════════
//  PAGE SÉANCE — MACHINE À ÉTATS
// ═══════════════════════════════════════════════════
function renderSeancePage() {
  const el = $('page-seance');

  if (!state.vma || !state.projet) {
    el.innerHTML = `<div class="no-data-msg">Effectuez d'abord le test Demi-Cooper et choisissez votre projet depuis l'accueil.</div>`;
    return;
  }

  const nb   = state.config.nb_seances_cycle || 6;
  const next = nextSeanceNum(state.seances, nb);

  if (!next) {
    el.innerHTML = `<div class="no-data-msg">🏆 Vous avez terminé toutes les séances du cycle !<br>Bravo pour votre engagement.</div>`;
    return;
  }

  // Si une séance est en cours, afficher son état
  if (state.seance) {
    renderSeancePhase();
    return;
  }

  // Page de préparation (avant de commencer)
  renderSeancePrepare(next);
}

function renderSeancePrepare(num) {
  const el    = $('page-seance');
  const p     = parseInt(state.projet);
  const def   = SEANCES_PROJETS[p][num - 1];
  const info  = PROJETS_INFO[p];
  const html  = [];

  html.push(`<div class="seance-header-card">
    <div class="seance-num-label">Séance ${num}</div>
    <div class="seance-subtitle">${info.icon} Projet ${p} — ${info.nom}</div>
    <div style="margin-top:.4rem;font-size:.8rem;color:var(--muted)">VMA : <strong style="color:var(--text)">${state.vma} km/h</strong> · Allure cible : <strong style="color:var(--text)">${calcAllure(state.vma * (p === 2 ? 0.925 : p === 1 ? 0.725 : 0.625))}/km</strong></div>
  </div>`);

  if (p === 1 || p === 2) {
    // Distances cibles par séquence
    const dureeMin  = def.dureeSec / 60;
    const coeff     = p === 2 ? 0.925 : 0.725;
    const pctVMA    = Math.round(coeff * 100);
    html.push(`<div class="section-title">Objectifs de la séance</div>`);
    html.push(`<div style="margin-bottom:1rem">`);
    for (let i = 0; i < def.nbSeq; i++) {
      const dist = calcDistanceCible(p, state.vma, dureeMin);
      html.push(`<div class="seq-prepare-item">
        <span class="seq-prepare-label">Séquence ${i+1} / ${def.nbSeq}</span>
        <span>
          <span class="seq-prepare-dist">${dist} m</span>
          <span style="font-size:.72rem;color:var(--muted)"> en ${fmtDureeLabel(def.dureeSec)}</span>
          <span style="font-size:.72rem;color:var(--accent);margin-left:.3rem">${pctVMA} % VMA</span>
        </span>
      </div>`);
    }
    if (def.recupSec) {
      html.push(`<div style="font-size:.78rem;color:var(--muted);text-align:center;margin-top:.5rem">Récupération entre chaque séquence : ${fmtDureeLabel(def.recupSec)}</div>`);
    }
    html.push(`</div>`);
  } else {
    // Projet 3
    html.push(`<div class="section-title">Structure de la séance</div>`);
    html.push(`<div class="card" style="margin-bottom:1rem">`);
    if (def.libre) {
      html.push(`<div style="text-align:center;padding:.5rem">
        <div style="font-size:2rem;margin-bottom:.5rem">🕐</div>
        <div style="font-weight:700;margin-bottom:.25rem">30 minutes libres</div>
        <div style="font-size:.85rem;color:var(--muted)">Courez le plus possible, marchez quand vous en avez besoin.</div>
      </div>`);
    } else {
      const c = def.cycles[0], m = def.cycles[1];
      html.push(`<div style="text-align:center;padding:.5rem">
        <div style="margin-bottom:.75rem">
          <span class="p3-block-badge course">${fmtDureeLabel(c.duree)} course</span>
          <span style="color:var(--muted);margin:0 .5rem">/</span>
          <span class="p3-block-badge marche">${fmtDureeLabel(m.duree)} marche</span>
        </div>
        <div style="font-size:.85rem;color:var(--muted)">× ${def.nb} cycles · 30 minutes au total</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:.3rem">Distance indicative : ${calcDistanceObjectifP3(state.vma)} m</div>
      </div>`);
    }
    html.push(`</div>`);
  }

  html.push(`<div class="tuto-alert blue" style="margin-bottom:1rem">
    <strong>📱 Conseil :</strong> Lancez votre application GPS maintenant pour mesurer la distance réelle à la fin de chaque séquence.
  </div>`);

  html.push(`<button class="btn" id="btn-start-seance">Commencer la séance</button>`);

  el.innerHTML = html.join('');
  $('btn-start-seance').onclick = () => startSeance(num);
}

function startSeance(num) {
  const p   = parseInt(state.projet);
  const def = SEANCES_PROJETS[p][num - 1];

  // Construire les données de séance
  if (p === 1 || p === 2) {
    const dureeMin = def.dureeSec / 60;
    const sequences = [];
    for (let i = 0; i < def.nbSeq; i++) {
      sequences.push({
        numero: i + 1,
        objectifDistance: calcDistanceCible(p, state.vma, dureeMin),
        objectifDuree:    def.dureeSec,
        distanceReelle:   null,
      });
    }
    state.seance = {
      num, projet: p, def,
      sequences,
      seqIndex: 0,
      phase: 'cours',     // cours | saisie | recup | bilan-saisie | bilan
      seqRunning: false,
      ressenti: null,
    };
  } else {
    const blocks = buildP3Blocks(def);
    state.seance = {
      num, projet: p, def,
      sequences: [],
      phase: 'p3-cours',  // p3-cours | p3-saisie | bilan
      p3Blocks:    blocks,
      p3BlockIdx:  0,
      p3TotalSec:  30 * 60,
      p3Elapsed:   0,
      ressenti:    null,
    };
  }

  renderSeancePhase();
}

// ─── Rendu selon la phase ────────────────────────────────────
function renderSeancePhase() {
  const el = $('page-seance');
  const s  = state.seance;
  if (!s) return;

  switch (s.phase) {
    case 'cours':        renderPhaseChronoCours(el); break;
    case 'saisie':       renderPhaseSaisie(el);      break;
    case 'recup':        renderPhaseRecup(el);        break;
    case 'bilan-saisie': renderPhaseBilanSaisie(el); break;
    case 'bilan':        renderPhaseBilan(el);        break;
    case 'p3-cours':     renderPhaseP3Cours(el);     break;
    case 'p3-saisie':    renderPhaseSaisieP3(el);    break;
  }
}

// ─── Phase : chrono course (P1/P2) ──────────────────────────
function renderPhaseChronoCours(el) {
  const s   = state.seance;
  const seq = s.sequences[s.seqIndex];
  const running = !!s.seqRunning;

  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Séance ${s.num}</div>
      <div class="seance-subtitle">Séquence ${s.seqIndex + 1} / ${s.sequences.length}</div>
    </div>
    <div class="chrono-card ${running ? 'running' : ''}" id="chrono-card">
      <div class="chrono-phase-label ${running ? 'running' : ''}">
        ${running ? 'Course en cours' : 'Prêt à partir ?'}
      </div>
      <div style="display:flex;justify-content:center;gap:1.5rem;margin-bottom:.75rem">
        <div style="text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--accent);line-height:1">${seq.objectifDistance}</div>
          <div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">mètres cibles</div>
        </div>
        <div style="width:1px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--text);line-height:1">${fmtDureeLabel(seq.objectifDuree)}</div>
          <div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">durée</div>
        </div>
      </div>
      <div class="chrono-display ${running ? 'running' : ''}" id="chrono-display">${fmtTime(seq.objectifDuree)}</div>
    </div>
    ${running
      ? `<button class="btn btn-pulse" id="btn-terminer-seq" style="margin-bottom:.75rem;padding:1.2rem;font-size:1.2rem;background:linear-gradient(135deg,var(--red),#c0392b)">✅ J'ai terminé la séquence</button>
         <div style="font-size:.75rem;color:var(--muted);text-align:center">Le chrono continue même si vous quittez cette page.</div>`
      : `<button class="btn btn-pulse" id="btn-start-seq" style="padding:1.4rem;font-size:1.3rem">▶ Démarrer la séquence</button>`
    }`;

  if (running) {
    startChrono(s._seqRemaining ?? seq.objectifDuree, 'cours');
    $('btn-terminer-seq').onclick = () => {
      stopChrono();
      s.seqRunning = false;
      s.phase = 'saisie';
      renderSeancePhase();
    };
  } else {
    $('btn-start-seq').onclick = () => {
      s.seqRunning = true;
      s._seqRemaining = seq.objectifDuree;
      renderPhaseChronoCours(el);
    };
  }
}

// ─── Phase : saisie distance (P1/P2) ────────────────────────
function renderPhaseSaisie(el) {
  const s   = state.seance;
  const seq = s.sequences[s.seqIndex];
  stopChrono();

  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Séance ${s.num}</div>
      <div class="seance-subtitle">Séquence ${s.seqIndex + 1} / ${s.sequences.length}</div>
    </div>
    <div class="saisie-card">
      <div class="saisie-title">Distance parcourue</div>
      <div class="saisie-objectif">Objectif : <span>${seq.objectifDistance} m</span> en ${fmtDureeLabel(seq.objectifDuree)}</div>
      <div class="distance-input-wrap">
        <input type="number" id="inp-dist-reelle" placeholder="0" min="0" max="5000">
        <span class="distance-unit">mètres</span>
      </div>
      <button class="btn" id="btn-valider-dist">Valider</button>
    </div>`;

  const inp = $('inp-dist-reelle');
  setTimeout(() => inp && inp.focus(), 100);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-valider-dist').click(); });

  $('btn-valider-dist').onclick = () => {
    const dist = parseInt(inp.value);
    if (!dist || dist < 0 || dist > 5000) { toast('Saisissez une distance valide.', 'error'); return; }

    seq.distanceReelle = dist;
    const pct = dist / seq.objectifDistance;
    const cls = pct >= 0.95 ? 'good' : pct >= 0.70 ? 'medium' : 'bad';
    const txt = Math.round(pct * 100) + ' %';

    // Afficher écart puis avancer
    el.insertAdjacentHTML('beforeend', `
      <div class="ecart-card ${cls}" id="ecart-card">
        <div class="ecart-pct ${cls}">${txt}</div>
        <div class="ecart-label">de l'objectif atteint (${dist} m / ${seq.objectifDistance} m)</div>
      </div>`);

    const isLast = s.seqIndex >= s.sequences.length - 1;

    if (!isLast && s.def.recupSec) {
      // Démarrer récupération
      setTimeout(() => {
        s.phase = 'recup';
        renderSeancePhase();
      }, 1500);
    } else if (!isLast) {
      setTimeout(() => {
        s.seqIndex++;
        s.phase = 'cours';
        renderSeancePhase();
      }, 1500);
    } else {
      setTimeout(() => {
        s.phase = 'bilan-saisie';
        renderSeancePhase();
      }, 1500);
    }
  };
}

// ─── Phase : récupération (P1/P2) ───────────────────────────
function renderPhaseRecup(el) {
  const s = state.seance;
  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Récupération</div>
      <div class="seance-subtitle">Séquence suivante dans…</div>
    </div>
    <div class="chrono-card recup" id="chrono-card">
      <div class="chrono-phase-label recup">Récupération active</div>
      <div class="chrono-display recup" id="chrono-display">${fmtTime(s.def.recupSec)}</div>
      <div style="margin-top:.75rem;background:rgba(61,139,255,.12);border:1px solid rgba(61,139,255,.3);border-radius:10px;padding:.65rem 1rem;font-size:1rem;font-weight:700;color:var(--blue)">🚶 Marchez ou trottinez doucement</div>
    </div>
    <button class="btn btn-pulse" id="btn-passer-recup" style="padding:1.2rem;font-size:1.2rem;background:linear-gradient(135deg,var(--blue),#5b9fff)">▶ Séquence suivante</button>`;

  $('btn-passer-recup').onclick = () => {
    stopChrono();
    s.seqIndex++;
    s.seqRunning = false;
    s.phase = 'cours';
    renderSeancePhase();
  };

  startChrono(s.def.recupSec, 'recup', () => {
    s.seqIndex++;
    s.seqRunning = false;
    s.phase = 'cours';
    renderSeancePhase();
  });
}

// ─── Phase : saisie ressenti (P1/P2) ────────────────────────
function renderPhaseBilanSaisie(el) {
  const s = state.seance;
  stopChrono();

  // Résumé des séquences
  const rows = s.sequences.map((seq, i) => {
    const done = seq.distanceReelle !== null;
    const pct  = done ? seq.distanceReelle / seq.objectifDistance : null;
    const cls  = !done ? '' : pct >= 0.95 ? 'good' : pct >= 0.70 ? 'medium' : 'bad';
    let pctVMA = null;
    if (done && seq.objectifDuree > 0 && state.vma > 0) {
      const vitesseReelle = (seq.distanceReelle / 1000) / (seq.objectifDuree / 3600);
      pctVMA = Math.round(vitesseReelle / state.vma * 100);
    }
    return `<div class="bilan-seq-row">
      <span class="bilan-seq-num">${i+1}</span>
      <span class="bilan-seq-dist">${done ? seq.distanceReelle + ' m' : '—'}</span>
      <span class="bilan-seq-ecart ${cls}">${done ? '/ ' + seq.objectifDistance + ' m · ' + Math.round(pct*100) + '%' : ''}</span>
      ${pctVMA !== null ? `<span class="bilan-seq-vma">${pctVMA} % VMA</span>` : '<span></span>'}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Fin de séance</div>
      <div class="seance-subtitle">Toutes les séquences terminées</div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Récapitulatif</div>
      ${rows}
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="saisie-title">Comment s'est passée la séance ?</div>
      <div class="ressenti-row" id="ressenti-row">
        <button class="ressenti-btn-large" data-val="F">😌<br>Facile</button>
        <button class="ressenti-btn-large" data-val="D">😤<br>Difficile</button>
        <button class="ressenti-btn-large" data-val="TD">😰<br>Très Difficile</button>
      </div>
    </div>
    <button class="btn" id="btn-calculer-bilan" disabled>Voir mon bilan</button>`;

  let ressentiSel = null;
  document.querySelectorAll('.ressenti-btn-large').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.ressenti-btn-large').forEach(b => b.className = 'ressenti-btn-large');
      btn.classList.add('sel-' + btn.dataset.val);
      ressentiSel = btn.dataset.val;
      $('btn-calculer-bilan').disabled = false;
    };
  });

  $('btn-calculer-bilan').onclick = () => {
    s.ressenti = ressentiSel;
    s.phase    = 'bilan';
    renderSeancePhase();
  };
}

// ─── Phase : bilan final (P1/P2) ────────────────────────────
function renderPhaseBilan(el) {
  const s = state.seance;

  const seqsWithDist = s.sequences.filter(q => q.distanceReelle !== null);
  const distTotale   = seqsWithDist.reduce((a, q) => a + q.distanceReelle, 0);
  const dureeTotal   = s.sequences.length * s.def.dureeSec;
  const vitesse      = distTotale > 0 ? Math.round((distTotale / 1000) / (dureeTotal / 3600) * 10) / 10 : 0;
  const allure       = calcAllure(vitesse);
  const moyPct       = seqsWithDist.length
    ? seqsWithDist.reduce((a, q) => a + Math.min(q.distanceReelle / q.objectifDistance, 1), 0) / seqsWithDist.length
    : 0;
  const badge = calcBadge(moyPct);
  const col   = badgeColor(badge);

  const rows = s.sequences.map((q, i) => {
    const done = q.distanceReelle !== null;
    const pct  = done ? q.distanceReelle / q.objectifDistance : null;
    const cls  = !done ? '' : pct >= 0.95 ? 'good' : pct >= 0.70 ? 'medium' : 'bad';
    return `<div class="bilan-seq-row">
      <span class="bilan-seq-num">${i+1}</span>
      <span class="bilan-seq-dist">${done ? q.distanceReelle + ' m' : '—'}</span>
      <span class="bilan-seq-ecart ${cls}">${done ? Math.round(pct*100) + ' %' : ''}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="bilan-badge-card" id="badge-card" style="border-color:${col}">
      <div class="bilan-badge-emoji">${badgeEmoji(badge)}</div>
      <div class="bilan-badge-name" style="color:${col}">${badge}</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:.3rem">Appuyez pour agrandir</div>
    </div>
    <div class="bilan-stats-grid">
      <div class="bilan-stat"><div class="bilan-stat-val">${distTotale}</div><div class="bilan-stat-key">mètres parcourus</div></div>
      <div class="bilan-stat"><div class="bilan-stat-val">${Math.round(moyPct*100)} %</div><div class="bilan-stat-key">objectif atteint</div></div>
      <div class="bilan-stat"><div class="bilan-stat-val">${vitesse}</div><div class="bilan-stat-key">km/h moy.</div></div>
      <div class="bilan-stat"><div class="bilan-stat-val">${allure}</div><div class="bilan-stat-key">allure min/km</div></div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Détail par séquence</div>
      ${rows}
    </div>
    <button class="btn" id="btn-enregistrer-seance">Enregistrer ma séance</button>
    <button class="btn btn-outline" id="btn-annuler-seance" style="margin-top:.6rem">Annuler (ne pas enregistrer)</button>`;

  $('badge-card').onclick = () => showBadgeZoom(badgeEmoji(badge), badge, col);

  $('btn-enregistrer-seance').onclick = async () => {
    const data = {
      date: todayISO(),
      vma: state.vma,
      sequences: s.sequences.map(q => ({
        numero: q.numero,
        objectifDistance: q.objectifDistance,
        objectifDuree:    q.objectifDuree,
        distanceReelle:   q.distanceReelle || 0,
      })),
      distanceTotale: distTotale,
      vitesseKmh:     vitesse,
      allureMinKm:    allure,
      ressenti:       s.ressenti,
      badge,
    };
    await saveSeanceData(s.num, data);
  };

  $('btn-annuler-seance').onclick = () => {
    state.seance = null;
    renderSeancePage();
  };
}

// ─── Phase : P3 chrono global ────────────────────────────────
function renderPhaseP3Cours(el) {
  const s = state.seance;
  const isLibre = s.def.libre;
  const totalSec = 30 * 60;

  if (!s._p3Started) {
    s._p3Started = true;
    s._p3StartTs = Date.now();
  }

  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Séance ${s.num} — Projet 3</div>
      <div class="seance-subtitle">${isLibre ? '30 minutes libres' : 'Course / Marche alternée'}</div>
    </div>
    <div class="chrono-card running" id="chrono-card">
      ${isLibre ? '' : `<div id="p3-block-label" class="p3-block-badge course">Course</div>`}
      <div class="chrono-phase-label running" id="chrono-phase-lbl">${isLibre ? 'Temps restant' : 'Bloc en cours'}</div>
      <div class="chrono-display running" id="chrono-display">${fmtTime(totalSec)}</div>
      ${!isLibre ? `<div class="p3-cycle-info" id="p3-cycle-info">Bloc 1/${s.p3Blocks.length}</div>` : ''}
    </div>
    <div class="p3-progress-track" style="margin-bottom:1rem">
      <div class="p3-progress-fill" id="p3-progress-fill" style="width:0%"></div>
    </div>
    <div class="tuto-alert green" style="margin-bottom:1rem">Courez selon le chrono. Votre appli GPS mesure la distance totale.</div>
    <button class="btn btn-pulse" id="btn-terminer-p3" style="padding:1.2rem;font-size:1.2rem;background:linear-gradient(135deg,var(--red),#c0392b)">⏹ Terminer la séance</button>`;

  startChronoP3(totalSec, isLibre);

  $('btn-terminer-p3').onclick = () => {
    stopChrono();
    s.phase = 'p3-saisie';
    renderSeancePhase();
  };
}

function renderPhaseSaisieP3(el) {
  const s   = state.seance;
  const obj = calcDistanceObjectifP3(state.vma);
  stopChrono();

  el.innerHTML = `
    <div class="seance-header-card">
      <div class="seance-num-label">Fin de séance</div>
      <div class="seance-subtitle">Projet 3 — 30 minutes</div>
    </div>
    <div class="saisie-card">
      <div class="saisie-title">Distance totale parcourue</div>
      <div class="saisie-objectif">Distance indicative : <span>${obj} m</span></div>
      <div class="distance-input-wrap">
        <input type="number" id="inp-dist-p3" placeholder="0" min="0" max="10000">
        <span class="distance-unit">mètres</span>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="saisie-title">Comment s'est passée la séance ?</div>
      <div class="ressenti-row">
        <button class="ressenti-btn-large" data-val="F">😌<br>Facile</button>
        <button class="ressenti-btn-large" data-val="D">😤<br>Difficile</button>
        <button class="ressenti-btn-large" data-val="TD">😰<br>Très Difficile</button>
      </div>
    </div>
    <button class="btn" id="btn-valider-p3" disabled>Voir mon bilan</button>`;

  let ressentiSel = null;
  document.querySelectorAll('.ressenti-btn-large').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.ressenti-btn-large').forEach(b => b.className = 'ressenti-btn-large');
      btn.classList.add('sel-' + btn.dataset.val);
      ressentiSel = btn.dataset.val;
      checkP3Ready();
    };
  });
  $('inp-dist-p3').addEventListener('input', checkP3Ready);

  function checkP3Ready() {
    const dist = parseInt($('inp-dist-p3').value);
    $('btn-valider-p3').disabled = !(dist > 0 && ressentiSel);
  }

  $('btn-valider-p3').onclick = () => {
    const dist = parseInt($('inp-dist-p3').value);
    const pct  = dist / obj;
    const badge = calcBadge(pct);
    const vitesse = Math.round((dist / 1000) / 0.5 * 10) / 10;
    const allure  = calcAllure(vitesse);

    // Passer au bilan P3
    s.ressenti = ressentiSel;
    s._p3dist  = dist;
    s._p3badge = badge;
    s._p3vitesse = vitesse;
    s._p3allure  = allure;
    s._p3obj     = obj;

    const col = badgeColor(badge);
    el.innerHTML = `
      <div class="bilan-badge-card" id="badge-card" style="border-color:${col}">
        <div class="bilan-badge-emoji">${badgeEmoji(badge)}</div>
        <div class="bilan-badge-name" style="color:${col}">${badge}</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:.3rem">Appuyez pour agrandir</div>
      </div>
      <div class="bilan-stats-grid">
        <div class="bilan-stat"><div class="bilan-stat-val">${dist}</div><div class="bilan-stat-key">mètres parcourus</div></div>
        <div class="bilan-stat"><div class="bilan-stat-val">${Math.round(pct*100)} %</div><div class="bilan-stat-key">objectif indicatif</div></div>
        <div class="bilan-stat"><div class="bilan-stat-val">${vitesse}</div><div class="bilan-stat-key">km/h moy.</div></div>
        <div class="bilan-stat"><div class="bilan-stat-val">${allure}</div><div class="bilan-stat-key">allure min/km</div></div>
      </div>
      <button class="btn" id="btn-enregistrer-seance">Enregistrer ma séance</button>
      <button class="btn btn-outline" id="btn-annuler-seance" style="margin-top:.6rem">Annuler</button>`;

    $('badge-card').onclick = () => showBadgeZoom(badgeEmoji(badge), badge, col);

    $('btn-enregistrer-seance').onclick = async () => {
      const data = {
        date: todayISO(),
        vma: state.vma,
        sequences: [{ numero: 1, objectifDistance: obj, objectifDuree: 1800, distanceReelle: dist }],
        distanceTotale: dist,
        vitesseKmh:     vitesse,
        allureMinKm:    allure,
        ressenti:       ressentiSel,
        badge,
      };
      await saveSeanceData(s.num, data);
    };

    $('btn-annuler-seance').onclick = () => { state.seance = null; renderSeancePage(); };
  };
}

// ─── Enregistrement séance ───────────────────────────────────
async function saveSeanceData(num, data) {
  loading(true);
  try {
    const r = await api({
      action:       'saveSeance',
      classe:       state.classe,
      nom:          state.nom,
      prenom:       state.prenom,
      mdp:          state.mdp,
      numeroSeance: num,
      data:         JSON.stringify(data),
    });
    if (r.error) { toast('Erreur : ' + r.error, 'error'); loading(false); return; }

    state.seances['S' + num] = data;
    state.seance = null;
    updateTopbar();
    toast('Séance S' + num + ' enregistrée !');
    loading(false);
    showPage('accueil');
  } catch (_) {
    toast('Erreur réseau. Réessayez.', 'error');
    loading(false);
  }
}

// ═══════════════════════════════════════════════════
//  CHRONOMÈTRE
// ═══════════════════════════════════════════════════
function stopChrono() {
  if (state.chrono && state.chrono.interval) {
    clearInterval(state.chrono.interval);
    state.chrono = null;
  }
}

function startChrono(dureeSec, mode, onEnd) {
  stopChrono();
  let remaining = dureeSec;
  updateChronoDisplay(remaining, mode);

  state.chrono = {
    interval: setInterval(() => {
      remaining--;
      if (remaining < 0) remaining = 0;
      if (state.seance && mode === 'cours') state.seance._seqRemaining = remaining;
      updateChronoDisplay(remaining, mode);
      if (remaining <= 0) {
        stopChrono();
        if (state.seance) state.seance.seqRunning = false;
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        if (onEnd) onEnd();
        else {
          if (mode === 'cours') { state.seance.phase = 'saisie'; renderSeancePhase(); }
        }
      }
    }, 1000)
  };
}

function startChronoP3(totalSec, isLibre) {
  stopChrono();
  const s = state.seance;
  let remaining = totalSec - s.p3Elapsed;

  // P3 avec blocs : calculer le bloc courant selon le temps écoulé
  let blockRemainingLocal = 0;
  if (!isLibre && s.p3Blocks.length > 0) {
    let acc = 0;
    let bIdx = 0;
    for (let i = 0; i < s.p3Blocks.length; i++) {
      if (acc + s.p3Blocks[i].duree > s.p3Elapsed) {
        bIdx = i;
        blockRemainingLocal = s.p3Blocks[i].duree - (s.p3Elapsed - acc);
        break;
      }
      acc += s.p3Blocks[i].duree;
    }
    s.p3BlockIdx = bIdx;
    updateP3BlockDisplay(s.p3Blocks[bIdx], bIdx, s.p3Blocks.length);
    updateChronoDisplay(blockRemainingLocal, 'p3-block');
  } else {
    updateChronoDisplay(remaining, 'cours');
  }

  state.chrono = {
    interval: setInterval(() => {
      if (remaining <= 0) {
        stopChrono();
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        s.phase = 'p3-saisie';
        renderSeancePhase();
        return;
      }
      remaining--;
      s.p3Elapsed++;
      const pct = (totalSec - remaining) / totalSec * 100;
      const fill = $('p3-progress-fill');
      if (fill) fill.style.width = pct + '%';

      if (isLibre) {
        updateChronoDisplay(remaining, 'cours');
      } else {
        // Calculer bloc courant
        let acc = 0;
        let bIdx = 0;
        let bRem = 0;
        for (let i = 0; i < s.p3Blocks.length; i++) {
          if (acc + s.p3Blocks[i].duree > s.p3Elapsed) {
            bIdx = i;
            bRem = s.p3Blocks[i].duree - (s.p3Elapsed - acc);
            break;
          }
          acc += s.p3Blocks[i].duree;
        }
        if (bIdx !== s.p3BlockIdx) {
          s.p3BlockIdx = bIdx;
          updateP3BlockDisplay(s.p3Blocks[bIdx], bIdx, s.p3Blocks.length);
          if (navigator.vibrate) navigator.vibrate(150);
        }
        updateChronoDisplay(bRem, 'p3-block');
      }
    }, 1000)
  };
}

function updateChronoDisplay(remaining, mode) {
  const disp = $('chrono-display');
  if (disp) {
    disp.textContent = fmtTime(remaining);
    disp.className   = 'chrono-display ' + (mode === 'recup' ? 'recup' : 'running');
  }
}

function updateP3BlockDisplay(block, idx, total) {
  const lbl  = $('p3-block-label');
  const info = $('p3-cycle-info');
  if (lbl) {
    lbl.textContent = block.type === 'course' ? 'Course' : 'Marche';
    lbl.className   = 'p3-block-badge ' + block.type;
  }
  if (info) info.textContent = 'Bloc ' + (idx + 1) + ' / ' + total;
}

// ═══════════════════════════════════════════════════
//  PAGE PROGRESSION
// ═══════════════════════════════════════════════════
function renderProgression() {
  const el = $('page-progression');
  if (!state.vma || !state.projet) {
    el.innerHTML = `<div class="no-data-msg">Connectez-vous et choisissez votre projet pour voir votre progression.</div>`;
    return;
  }

  const p    = parseInt(state.projet);
  const nb   = state.config.nb_seances_cycle || 6;
  const html = [];

  // Listes objets/réels
  const objectifs = [];
  const reels     = [];
  for (let i = 1; i <= nb; i++) {
    const def = SEANCES_PROJETS[p][i - 1];
    let obj;
    if (p === 1 || p === 2) {
      const dureeMin = def.dureeSec / 60;
      obj = calcDistanceCible(p, state.vma, dureeMin) * def.nbSeq;
    } else {
      obj = calcDistanceObjectifP3(state.vma);
    }
    objectifs.push(obj);

    const s = state.seances['S' + i];
    reels.push(s ? (s.distanceTotale || 0) : null);
  }

  html.push(`<div class="progression-chart">
    <div class="progression-chart-title">Distance par séance</div>
    ${buildSVGChart(objectifs, reels, nb)}
    <div class="chart-legend">
      <div class="chart-legend-item"><div class="chart-legend-dash"></div> Objectif</div>
      <div class="chart-legend-item"><div class="chart-legend-line"></div> Réalisé</div>
    </div>
  </div>`);

  html.push(`<div class="section-title">Détail des séances</div>`);
  for (let i = 1; i <= nb; i++) {
    const s = state.seances['S' + i];
    if (!s) {
      html.push(`<div class="progression-seance-row">
        <div class="prog-seq-num">S${i}</div>
        <div class="prog-seq-info" style="color:var(--muted)">Non effectuée</div>
      </div>`);
    } else {
      html.push(`<div class="progression-seance-row">
        <div class="prog-seq-num">S${i}</div>
        <div class="prog-seq-info">
          <div class="prog-seq-dist">${s.distanceTotale} m · ${s.vitesseKmh} km/h</div>
          <div class="prog-seq-date">${s.date || ''} · Ressenti : ${s.ressenti || '—'}</div>
        </div>
        <div class="prog-seq-badge">${badgeEmoji(s.badge)}</div>
      </div>`);
    }
  }

  el.innerHTML = html.join('');
}

function buildSVGChart(objectifs, reels, nb) {
  const W = 300, H = 160;
  const pL = 42, pR = 10, pT = 12, pB = 28;
  const cW = W - pL - pR;
  const cH = H - pT - pB;

  const allVals = [...objectifs, ...reels.filter(v => v !== null)];
  if (!allVals.length) return '<svg viewBox="0 0 300 160" class="chart-svg"></svg>';

  const maxV = Math.max(...allVals) * 1.1;
  const xOf  = i => pL + (i / (nb - 1)) * cW;
  const yOf  = v => pT + cH - (v / maxV) * cH;

  let svgLines = '';

  // Grille horizontale
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const v = maxV * (s / steps);
    const y = yOf(v);
    const label = Math.round(v);
    svgLines += `<line x1="${pL}" y1="${y}" x2="${W - pR}" y2="${y}" stroke="var(--border)" stroke-width="0.5"/>`;
    if (s > 0) svgLines += `<text x="${pL - 3}" y="${y + 4}" font-size="8" fill="var(--muted)" text-anchor="end">${label}</text>`;
  }

  // Axe X labels
  for (let i = 0; i < nb; i++) {
    const x = xOf(i);
    svgLines += `<text x="${x}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="middle">S${i+1}</text>`;
  }

  // Ligne objectif (pointillés)
  const objPts = objectifs.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
  svgLines += `<polyline points="${objPts}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4,3"/>`;

  // Ligne réalisé (pleine)
  const realPts = [];
  reels.forEach((v, i) => { if (v !== null) realPts.push(`${xOf(i)},${yOf(v)}`); });
  if (realPts.length > 1) {
    svgLines += `<polyline points="${realPts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  }

  // Points
  reels.forEach((v, i) => {
    if (v === null) return;
    svgLines += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="4" fill="var(--accent)"/>`;
  });
  objectifs.forEach((v, i) => {
    svgLines += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="3" fill="var(--muted)"/>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" style="font-family:'DM Sans',sans-serif">${svgLines}</svg>`;
}

// ═══════════════════════════════════════════════════
//  PAGE LEXIQUE
// ═══════════════════════════════════════════════════
function renderLexique() {
  const el = $('page-lexique');
  el.innerHTML = `
    <div class="ressource-header">
      <div class="ressource-title">📖 Lexique</div>
    </div>
    <div class="lexique-search-wrap">
      <input class="lexique-search" id="lex-search" type="text" placeholder="Rechercher un terme…">
      <button class="lex-clear" id="lex-clear">✕</button>
    </div>
    <div id="lex-list"></div>
    <div class="lex-noresult" id="lex-noresult" style="display:none">Aucun terme correspondant.</div>`;

  function renderTermes(filter) {
    const list = $('lex-list');
    const terms = filter
      ? LEXIQUE.filter(t => t.terme.toLowerCase().includes(filter) || t.def.toLowerCase().includes(filter))
      : LEXIQUE;
    $('lex-noresult').style.display = terms.length ? 'none' : 'block';
    list.innerHTML = terms.map(t =>
      `<div class="terme-card"><div class="terme-card-nom">${t.terme}</div><div class="terme-card-def">${t.def}</div></div>`
    ).join('');
  }

  renderTermes('');

  const inp = $('lex-search');
  const clr = $('lex-clear');
  inp.oninput = () => {
    const v = inp.value.toLowerCase().trim();
    clr.style.display = v ? 'block' : 'none';
    renderTermes(v);
  };
  clr.onclick = () => { inp.value = ''; clr.style.display = 'none'; renderTermes(''); inp.focus(); };
}

// ═══════════════════════════════════════════════════
//  PAGE TUTORIEL
// ═══════════════════════════════════════════════════
function renderTuto() {
  const el = $('page-tuto');
  el.innerHTML = `
    <div class="ressource-header">
      <div class="ressource-title">❓ Tutoriel</div>
    </div>

    <div class="section-title">Démarrer</div>
    <div class="tuto-step"><div class="tuto-step-num">1</div><div class="tuto-step-content">
      <div class="tuto-step-title">Connexion</div>
      Sélectionnez votre classe, votre nom, puis saisissez votre mot de passe. La première fois, créez un mot de passe de 6 à 10 lettres minuscules.
    </div></div>
    <div class="tuto-step"><div class="tuto-step-num">2</div><div class="tuto-step-content">
      <div class="tuto-step-title">Test Demi-Cooper</div>
      Courez 6 minutes le plus loin possible. Saisissez la distance pour calculer votre VMA et choisir votre projet.
    </div></div>
    <div class="tuto-step"><div class="tuto-step-num">3</div><div class="tuto-step-content">
      <div class="tuto-step-title">Choisir un projet</div>
      3 projets correspondent à 3 objectifs différents. Vous pouvez accepter la suggestion ou en choisir un autre.
    </div></div>

    <div class="section-title">Pendant la séance</div>
    <div class="tuto-step"><div class="tuto-step-num">4</div><div class="tuto-step-content">
      <div class="tuto-step-title">Lancer votre application GPS</div>
      Avant de commencer, ouvrez une appli GPS (Google Fit, Strava, Running…) pour mesurer la distance réelle.
    </div></div>
    <div class="tuto-step"><div class="tuto-step-num">5</div><div class="tuto-step-content">
      <div class="tuto-step-title">Suivre le chronomètre</div>
      L'application gère le chrono de chaque séquence et la récupération. À la fin de chaque séquence, saisissez la distance parcourue.
    </div></div>
    <div class="tuto-step"><div class="tuto-step-num">6</div><div class="tuto-step-content">
      <div class="tuto-step-title">Bilan et badge</div>
      À la fin, l'application calcule votre performance et attribue un badge selon votre taux de réalisation des objectifs.
    </div></div>

    <div class="section-title">Badges</div>
    <div class="card" style="margin-bottom:1rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
        <div style="background:var(--s2);border-radius:10px;padding:.65rem;text-align:center">
          <div style="font-size:1.8rem">🥇</div>
          <div style="font-weight:700;color:var(--yellow)">Or</div>
          <div style="font-size:.75rem;color:var(--muted)">≥ 95 % objectif</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:.65rem;text-align:center">
          <div style="font-size:1.8rem">🥈</div>
          <div style="font-weight:700;color:var(--muted)">Argent</div>
          <div style="font-size:.75rem;color:var(--muted)">85–94 %</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:.65rem;text-align:center">
          <div style="font-size:1.8rem">🥉</div>
          <div style="font-weight:700;color:#cd7f32">Bronze</div>
          <div style="font-size:.75rem;color:var(--muted)">70–84 %</div>
        </div>
        <div style="background:var(--s2);border-radius:10px;padding:.65rem;text-align:center">
          <div style="font-size:1.8rem">📦</div>
          <div style="font-weight:700;color:var(--red)">Carton</div>
          <div style="font-size:.75rem;color:var(--muted)">< 70 %</div>
        </div>
      </div>
    </div>

    <div class="tuto-alert blue" style="margin-bottom:.75rem">
      <strong>💡 Conseil :</strong> Installez l'application sur votre écran d'accueil pour un accès rapide. Touchez le bouton « Partager » de votre navigateur, puis « Sur l'écran d'accueil ».
    </div>
    <div class="tuto-alert yellow" style="margin-bottom:.75rem">
      <strong>⚠️ Connexion requise</strong> lors de la connexion et de l'enregistrement de la séance. Pendant la séance, le chrono fonctionne hors ligne.
    </div>`;
}

// ═══════════════════════════════════════════════════
//  BADGE ZOOM
// ═══════════════════════════════════════════════════
function showBadgeZoom(emoji, label, color) {
  $('badge-zoom-emoji').textContent = emoji;
  $('badge-zoom-label').textContent = label;
  $('badge-zoom-label').style.color = color || '#fff';
  $('badge-zoom').classList.remove('hidden');
}
function closeBadgeZoom() {
  $('badge-zoom').classList.add('hidden');
}

// ═══════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════
let _modalConfirmCb = null;
function showModal(titre, texte, labelConfirm, onConfirm) {
  $('modal-titre').textContent   = titre;
  $('modal-texte').textContent   = texte;
  $('modal-confirm').textContent = labelConfirm || 'Confirmer';
  _modalConfirmCb = onConfirm;
  $('modal-bg').classList.remove('hidden');
}
$('modal-cancel').onclick  = () => $('modal-bg').classList.add('hidden');
$('modal-confirm').onclick = () => {
  $('modal-bg').classList.add('hidden');
  if (_modalConfirmCb) _modalConfirmCb();
};

// ═══════════════════════════════════════════════════
//  VISIBILITYCHANGE (reprise sur mobile)
// ═══════════════════════════════════════════════════
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && _currentPage === 'seance' && state.seance) {
    renderSeancePhase();
  }
});
window.addEventListener('pageshow', () => {
  if (state.classe) updateTopbar();
});

// ═══════════════════════════════════════════════════
//  SERVICE WORKER
// ═══════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ═══════════════════════════════════════════════════
//  DÉMARRAGE
// ═══════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', initLogin);
