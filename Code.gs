// ============================================================
//  Course en Durée J2B — Google Apps Script (Web App)
//  Toutes les requêtes en GET (évite les problèmes CORS)
// ============================================================

// ── Indices de colonnes (feuille classe) ────────────────────
const COL_NOM     = 0; // A
const COL_PRENOM  = 1; // B
const COL_CLASSE  = 2; // C
const COL_MDP     = 3; // D
const COL_VMA     = 4; // E
const COL_PROJET  = 5; // F
const COL_S_START = 6; // G = S1, H = S2, ..., P = S10
const NB_SEANCES  = 10;

// ════════════════════════════════════════════════════════════
//  ROUTEUR PRINCIPAL
// ════════════════════════════════════════════════════════════
function doGet(e) {
  const p      = e.parameter;
  const action = p.action;
  try {
    if (action === 'getClasses')  return json(handleGetClasses());
    if (action === 'getEleves')   return json(handleGetEleves(p.classe));
    if (action === 'login')       return json(handleLogin(p));
    if (action === 'saveSeance')  return json(handleSaveSeance(p));
    if (action === 'saveVMA')     return json(handleSaveVMA(p));
    if (action === 'getConfig')   return json(handleGetConfig());
    return json({ error: 'Action inconnue : ' + action });
  } catch (err) {
    return json({ error: err.toString() });
  }
}

function doPost(e) { return doGet(e); }

// ════════════════════════════════════════════════════════════
//  HANDLERS
// ════════════════════════════════════════════════════════════

// ── Liste des classes ────────────────────────────────────────
function handleGetClasses() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const classes = ss.getSheets()
    .map(s => s.getName())
    .filter(n => n !== 'Config');
  return { success: true, classes };
}

// ── Liste des élèves d'une classe ───────────────────────────
function handleGetEleves(classe) {
  const sheet = getSheet(classe);
  if (!sheet) return { error: 'Classe introuvable : ' + classe };

  const data   = sheet.getDataRange().getValues();
  const eleves = [];
  for (let i = 1; i < data.length; i++) {
    const nom = (data[i][COL_NOM] || '').toString().trim();
    if (!nom) continue;
    eleves.push({
      nom,
      prenom: (data[i][COL_PRENOM] || '').toString().trim(),
      hasMdp: !!(data[i][COL_MDP] || '').toString().trim()
    });
  }
  return { success: true, eleves };
}

// ── Connexion — renvoie toutes les données élève + config ───
function handleLogin(p) {
  const { sheet, rowIndex, data } = findEleve(p.classe, p.nom, p.prenom);
  if (!sheet) return { error: 'Élève introuvable.' };

  const row       = data[rowIndex];
  const mdpStored = (row[COL_MDP] || '').toString().trim();
  const isFirst   = mdpStored === '';

  if (!isFirst && mdpStored !== (p.mdp || '').toString().trim()) {
    return { error: 'Mot de passe incorrect.' };
  }

  // Si première connexion, enregistrer le mot de passe
  if (isFirst && p.mdp) {
    sheet.getRange(rowIndex + 1, COL_MDP + 1).setValue(p.mdp);
  }

  // Lecture des séances S1–S10
  const seances = {};
  for (let i = 0; i < NB_SEANCES; i++) {
    const raw = (row[COL_S_START + i] || '').toString().trim();
    if (raw) {
      try { seances['S' + (i + 1)] = JSON.parse(raw); } catch (_) {}
    }
  }

  const config = handleGetConfig();

  return {
    success:     true,
    isFirstLogin: isFirst,
    mdp:         isFirst ? (p.mdp || '') : mdpStored,
    vma:         row[COL_VMA]    ? parseFloat(row[COL_VMA])          : null,
    projet:      row[COL_PROJET] ? row[COL_PROJET].toString().trim() : '',
    seances,
    config
  };
}

// ── Enregistrer une séance ───────────────────────────────────
function handleSaveSeance(p) {
  const { sheet, rowIndex, data } = findEleve(p.classe, p.nom, p.prenom);
  if (!sheet) return { error: 'Élève introuvable.' };

  const row       = data[rowIndex];
  const mdpStored = (row[COL_MDP] || '').toString().trim();
  if (mdpStored && mdpStored !== (p.mdp || '').toString().trim()) {
    return { error: 'Mot de passe incorrect.' };
  }

  const num = parseInt(p.numeroSeance);
  if (isNaN(num) || num < 1 || num > NB_SEANCES) {
    return { error: 'Numéro de séance invalide.' };
  }

  sheet.getRange(rowIndex + 1, COL_S_START + num).setValue(p.data);

  // Mise à jour VMA et projet si fournis
  if (p.vma  !== undefined && p.vma  !== '') {
    sheet.getRange(rowIndex + 1, COL_VMA    + 1).setValue(parseFloat(p.vma));
  }
  if (p.projet !== undefined && p.projet !== '') {
    sheet.getRange(rowIndex + 1, COL_PROJET + 1).setValue(p.projet);
  }

  return { success: true };
}

// ── Enregistrer la VMA et le projet (après Demi-Cooper) ─────
function handleSaveVMA(p) {
  const { sheet, rowIndex, data } = findEleve(p.classe, p.nom, p.prenom);
  if (!sheet) return { error: 'Élève introuvable.' };

  const row       = data[rowIndex];
  const mdpStored = (row[COL_MDP] || '').toString().trim();
  if (mdpStored && mdpStored !== (p.mdp || '').toString().trim()) {
    return { error: 'Mot de passe incorrect.' };
  }

  if (p.vma    !== undefined) sheet.getRange(rowIndex + 1, COL_VMA    + 1).setValue(parseFloat(p.vma));
  if (p.projet !== undefined) sheet.getRange(rowIndex + 1, COL_PROJET + 1).setValue(p.projet);

  return { success: true };
}

// ── Lire l'onglet Config ─────────────────────────────────────
function handleGetConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  if (!sheet) return { acces_bloque: false };

  const data   = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 0; i < data.length; i++) {
    const key = (data[i][0] || '').toString().trim();
    if (!key) continue;
    let val = data[i][1];
    config[key] = val;
  }

  // Normaliser le booléen acces_bloque
  const ab = config['acces_bloque'];
  config.acces_bloque = (ab === true || ab === 'TRUE' || ab === 'true');

  // Normaliser les entiers
  if (config['nb_seances_cycle']) config.nb_seances_cycle = parseInt(config['nb_seances_cycle']) || 6;
  if (config['points_demi_cooper']) config.points_demi_cooper = parseInt(config['points_demi_cooper']) || 4;

  return config;
}

// ════════════════════════════════════════════════════════════
//  UTILITAIRES
// ════════════════════════════════════════════════════════════

function getSheet(classe) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(classe);
}

function findEleve(classe, nom, prenom) {
  const sheet = getSheet(classe);
  if (!sheet) return { sheet: null };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_NOM] === nom && data[i][COL_PRENOM] === prenom) {
      return { sheet, rowIndex: i, data };
    }
  }
  return { sheet: null };
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
