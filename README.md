# goose-multiplayer

Jeu de l'oie en ligne, 2 à 6 joueurs, TypeScript, serveur autoritaire,
auto-hébergé. Le moteur, le serveur et le client navigateur sont en place :
deux onglets suffisent pour jouer une partie complète.

## Lancer le jeu

```bash
npm install
npm run build          # le serveur sert le bundle du client, il faut le construire
npm start -w @goose/server   # port 5050
npm run dev -w @goose/web    # port 5173, proxy /socket.io et /healthz vers 5050
```

Le port 5050 plutôt que 5000 : sur macOS, Control Center occupe le 5000 pour
AirPlay et la panne ressemble à un 403 renvoyé par un serveur que personne n'a
démarré.

Ouvrir <http://localhost:5173> dans deux onglets. Le premier crée la table, le
second rejoint avec le code à six caractères. Chaque onglet garde un jeton de
session dans `localStorage` : un rafraîchissement ou une coupure réseau
retrouve le même siège au lieu d'attendre les 90 secondes de grâce.

Contrôles :

```bash
npm run verify         # lint, typecheck, tests
npm run format:check
```

Le client ne connaît aucune règle. Le serveur envoie `legalMoves` dans chaque
vue ; le client affiche ce qu'il reçoit et émet des intentions.

Un double aux deux dés redonne la main au même siège, trois fois de suite au
maximum. L'hôte choisit ce que coûte le troisième : le tour passe, ou le siège
repart de la case 0. Règle maison activée par défaut, inerte et grisée avec un
seul dé.

Le lancer se joue plutôt qu'il ne s'affiche : les dés partent d'une face vide,
roulent 900 ms puis se posent sur le résultat, et le pion marche la chaîne
étape par étape, 450 ms chacune, le fil de la partie au même rythme. Le serveur
connaît le résultat avant l'animation ; le client le retient jusqu'à ce que les
dés se posent. `prefers-reduced-motion: reduce` affiche tout d'un coup.

## Docker

L'image sert l'API, les WebSockets et le bundle du client sur un seul port.

```bash
docker compose up --build -d
curl -fsS http://localhost:5050/healthz   # {"status":"ok"}
docker compose down
```

Les deux étages du `Dockerfile` suivent `.nvmrc`, pas le plancher `engines` de
`package.json` : `engines` dit ce que le code supporte encore, `.nvmrc` dit la
version que la CI lint, couvre et joue au navigateur. `scripts/check-node-versions.sh`
échoue quand les deux divergent, parce qu'elles ont déjà divergé en silence.

`compose.traefik.yaml` déploie derrière un Traefik existant : trois
remplacements à faire, aucun mapping `ports:` et le réseau en `external: true`.
Publier 5050 sur l'hôte ouvrirait une entrée en HTTP clair qui contourne TLS.

Les tables vivent en mémoire : ne jamais dépasser une réplique. Deux répliques
en tiendraient chacune la moitié sans que l'une connaisse l'autre.

## Bout en bout

La suite Playwright joue de vraies parties dans un navigateur, contre l'image
réelle et derrière un vrai Traefik.

```bash
npx playwright install chromium
npm run e2e
```

Rien à démarrer à la main : le `globalSetup` construit l'image, lève Traefik,
attend `/healthz` et le `globalTeardown` redescend tout.

Pourquoi un vrai Traefik plutôt que le serveur de dev : le serveur de dev
proxie la montée en WebSocket pour vous, et c'est précisément ce qui casse en
production. `e2e/compose.e2e.yaml` se superpose à `compose.traefik.yaml`, donc
ce que la suite pilote est la définition de service qui part en déploiement,
`BEHIND_TLS=true` et aucun mapping `ports:` compris. Aucune configuration
WebSocket nulle part : Traefik proxie la montée lui-même, et la suite le prouve
au lieu de le supposer.

Trois parcours : le salon et les règles, une partie à deux jouée jusqu'au
jardin, et une table pleine à six avec un septième joueur refusé.

Le port d'entrée est le 8088, réglable avec `E2E_PORT`.

## Intégration continue

| Workflow             | Ce qu'il fait                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`             | Lint, format, types, tests sur Node 22, 24 et 26, couverture, puis construction de l'image, démarrage, sondes, et publication sur GHCR depuis `main` uniquement |
| `release.yml`        | `cog bump` sur les Conventional Commits, tag, release GitHub, image taguée en semver                                                                            |
| `github-actions.yml` | `zizmor` audite les workflows eux-mêmes : épinglage par SHA, permissions minimales, injection de template                                                       |

Les actions sont épinglées par SHA de commit, avec la version en commentaire sur
la même ligne. L'image publiée est celle que le pipeline a démarrée et sondée,
retaguée et non reconstruite : une seconde construction publierait quelque chose
dont personne n'a prouvé que ça démarre.

Le crochet `pre-commit` couvre le trou entre `npm run verify` et la CI : `verify`
ne lance ni `format:check` ni `build`, et un fichier non formaté est déjà passé
en local avant de casser la CI.

```bash
pre-commit install
```

## Où en est le projet

| Document                                                                | Ce qu'il contient                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Design](docs/superpowers/specs/2026-08-25-goose-multiplayer-design.md) | Les règles figées, l'architecture, le modèle du tour, les décisions et les alternatives écartées |
| [`design/`](design/)                                                    | Les maquettes : table desktop et mobile, salon, cases spéciales                                  |

## Les maquettes

![La table, desktop](design/png/Main.png)

La direction visuelle est la risographie : encres en surimpression, aplats
francs, Archivo Black, ombres portées dures. Elle a été retenue contre trois
autres, gardées dans `design/png/` pour mémoire : une estampe gravée, un circuit
néon et une géométrie suisse. C'est la seule des quatre qui tienne aussi bien à
46 px de case sur un téléphone qu'en grand.

|                                      |                                               |
| ------------------------------------ | --------------------------------------------- |
| ![Le salon](design/png/Lobby.png)    | ![Le mobile](design/png/TableMobile.png)      |
| ![Les cases](design/png/Squares.png) | ![Écartée : estampe](design/png/Grimoire.png) |

La couleur d'une case dit ce qu'elle fait, mais c'est de l'emphase et jamais le
message : chaque case porte aussi son numéro, et chaque case spéciale son icône.
Une couleur seule ne dit rien à un lecteur d'écran ni en plein soleil.

La géométrie de la spirale est calculée, pas dessinée : 62 cases sur trois tours,
pas d'arc et pas radial égaux pour que la bande se lise uniformément, case 63 en
médaillon central. `apps/web/src/lib/board-layout.ts` porte un portage de cette
même fonction, avec les mêmes paramètres. Ce sont deux copies et rien ne les
tient synchronisées : changer la spirale ici demande de la changer là aussi.

```bash
node design/build.mjs      # régénère les artboards
node design/export-png.mjs # les rend en PNG dans design/png/
```

## Le monorepo

| Espace de travail   | Rôle                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `packages/engine`   | Les règles pures : plateau, dés, chaîne de résolution. Aucun état réseau      |
| `packages/protocol` | Les types de la vue et les schémas zod qui gardent chaque action client       |
| `apps/server`       | Express et Socket.IO, les salles, les tours et la présence                    |
| `apps/web`          | Le client React : spirale au-dessus de 700 px de conteneur, grille en dessous |

## Licence

ISC.
