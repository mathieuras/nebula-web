# NEBULA — version web déployable

Prototype 3D navigateur basé sur HTML, CSS, JavaScript, Three.js et un Web Worker.
Three.js est chargé depuis jsDelivr : une connexion Internet est nécessaire.

## Déploiement recommandé : Cloudflare Pages + dépôt GitHub

Cette méthode fournit une URL publique HTTPS et redéploie automatiquement le site à chaque mise à jour envoyée dans la branche principale.

1. Créez ou connectez-vous à un compte GitHub : https://github.com/
2. Créez un dépôt nommé `nebula-web`. Pour rendre le site publiquement accessible sans configuration supplémentaire, choisissez un dépôt public. N'ajoutez aucune clé secrète ni donnée privée.
3. Téléversez le contenu de ce dossier à la racine du dépôt (`index.html`, `main.js`, `style.css`, `simulation-worker.js`, `_headers`, `.nojekyll`, `README.md`, `ARCHITECTURE.md`) et validez les changements (`Commit changes`).
4. Ouvrez https://dash.cloudflare.com/ puis **Workers & Pages** → **Create** → **Pages** → **Connect to Git** (les libellés peuvent varier).
5. Autorisez l'accès au dépôt `nebula-web` et sélectionnez-le.
6. Paramètres de compilation :
   - Framework preset : `None` / `No framework`
   - Build command : laisser vide
   - Build output directory : `/` ou `.` (racine du dépôt, selon l'interface)
   - Root directory : laisser vide / racine
7. Lancez le déploiement. Cloudflare affichera l'URL publique attribuée, généralement sous `pages.dev`.
8. À chaque mise à jour : remplacez les fichiers concernés dans GitHub et validez les changements. Cloudflare reconstruira et publiera automatiquement le site.

## Vérification après déploiement

- Ouvrir l'URL publique dans Chrome, Firefox ou Edge récent.
- Vérifier que l'écran de chargement disparaît et que la scène 3D apparaît.
- Vérifier dans les outils développeur du navigateur qu'il n'y a pas d'erreur réseau sur Three.js ni sur `simulation-worker.js`.
- Tester les boutons d'interaction et les commandes clavier.

## Déploiement local

Depuis ce dossier, lancez `python3 -m http.server 8000` puis ouvrez `http://localhost:8000`.

## Limites actuelles

- Ce projet est un prototype navigateur, pas un build Unreal Engine.
- La scène charge Three.js et ses modules depuis jsDelivr, donc elle nécessite Internet.
- La simulation du mouvement utilise un Web Worker ; aucun module C++/WebAssembly n'est encore compilé.
- L'URL publique ne peut être créée qu'après connexion et autorisation du compte d'hébergement. Ce dossier est préparé au déploiement, mais n'est pas lui-même hébergé.
