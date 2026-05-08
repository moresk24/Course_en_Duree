# Roadmap — Course en Durée

## Questions à clarifier avant de coder

### 1. Le test de référence (équivalent du "maxi" en muscu)
Quel test utilises-tu pour mesurer le niveau de départ de l'élève ?
- Test de Léger-Bouchard (navettes 20 m) → donne la VMA
- Demi-Cooper (6 min) → donne une distance → VMA estimée
- Vam-Eval
- Autre ?

### 2. Les projets / filières d'entraînement
Existe-t-il plusieurs filières différenciées selon l'objectif de l'élève (comme les 4 projets en muscu : Sportif, Esthétique, Santé A/B) ?
- Si oui, lesquels ? Avec quels paramètres (intensité en % VMA, durée effort, récupération, etc.) ?

### 3. La structure d'une séance
Qu'est-ce qu'une séance typique ?
- Course continue à X% de la VMA ?
- Fractionné (intervalles effort/récup) ?
- L'élève choisit son contenu ou c'est imposé par le projet ?

### 4. Ce que l'élève saisit dans l'app
Pendant ou après la séance, que note-t-il ?
- Ressentis (comme en muscu : F / D / TD) ?
- Temps couru, distance, allure ?
- Nombre de fractions complètes ?
- Autre ?

### 5. Badges / progression
- Même système de badges (Carton / Bronze / Argent / Or) qu'en muscu ?
- Ou une autre logique de progression ?

---

## État initial du projet

Tous les fichiers (`index.html`, `data.js`, `app.js`, `Code.gs`, `styles.css`, `sw.js`) sont des copies de Muscu J2B V2 non encore adaptées. Tout le contenu métier est à réécrire.

L'architecture technique est conservée à l'identique :
- PWA vanilla HTML/CSS/JS, sans build
- Backend Google Apps Script (tout-GET)
- Google Sheets comme base de données
- Connexion classe/nom/mot de passe
- Thème clair/sombre, SPA avec nav bas d'écran
