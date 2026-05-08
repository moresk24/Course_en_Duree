# CLAUDE.md — Course en Durée

Ce fichier fournit les instructions à Claude Code pour travailler sur ce projet.

## Conventions de l'interface

- L'application **vouvoie** l'utilisateur dans tous les textes visibles (boutons, messages, toasts, labels)
- Langue française uniquement
- Pas d'argot ni de familiarités

## Contrainte matérielle importante

L'application est utilisée par des lycéens en cours d'EPS. **Tous les appareils ne sont pas récents** — certains élèves utilisent de vieux iPhones ou Android d'entrée de gamme. Privilégier :
- CSS simple et performant (éviter les effets lourds, les `backdrop-filter` excessifs, les animations complexes)
- JavaScript vanilla sans dépendances
- Pas de fonctionnalités nécessitant des APIs récentes du navigateur
- Tester mentalement le rendu sur petits écrans (320px de large minimum)

## Architecture

Même stack que le projet de référence **Muscu J2B V2** (`/Users/moresk/Documents/GitHub-Projets/Muscu_J2B_V2/`) :

- **PWA vanilla** HTML/CSS/JS, sans build step, sans bundler, sans npm
- **Backend** : Google Apps Script Web App (`Code.gs`), déployé comme extension Google Sheets
- Toutes les requêtes API sont des GET (pas de POST, pour éviter les problèmes CORS)

### Fichiers

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure HTML (écrans, pages, overlays) |
| `styles.css` | Tout le CSS |
| `data.js` | Constantes, données métier, utilitaires partagés |
| `app.js` | Toute la logique applicative |
| `sw.js` | Service Worker (cache PWA) |
| `Code.gs` | Backend Google Apps Script |

### Patterns réutilisés depuis Muscu J2B V2

- `api(params)` / `apiPost(body)` : requêtes GET vers le backend
- `fetchWithTimeout(url, ms)` : timeout via AbortController
- Système de thème clair/sombre (CSS variables + localStorage)
- Menu hamburger ☰
- Système de pages SPA (`showPage(name)`, `PAGES` array)
- Overlays (loading, toast, badge zoom)
- Drum pickers (roulettes)
- Service Worker avec `skipWaiting()` + `clients.claim()`
- `visibilitychange` + `pageshow` pour la reprise d'app sur mobile

## Projet à construire

> **À compléter lors du démarrage du projet** — fonctionnalités, modèle de données, structure GSheet, etc.

## Fin de session — mise à jour mémoire

À chaque fois que la conversation ralentit ou que l'utilisateur signale la fin de la session, mettre à jour automatiquement les fichiers mémoire avec les fonctionnalités implémentées, bugs corrigés, et roadmap.
