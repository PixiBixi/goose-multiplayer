# goose-multiplayer

Jeu de l'oie en ligne, 2 à 6 joueurs, TypeScript, serveur autoritaire,
auto-hébergé. Le moteur, le serveur et le client naviguateur sont en place :
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

Le canvas publié :
<https://claude.ai/code/artifact/050ddd9e-a02a-4da7-a25b-9f30afdb845f>

## Les maquettes

`design/build.mjs` génère les artboards. La géométrie de la spirale est calculée,
pas dessinée : 62 cases sur trois tours, pas d'arc et pas radial égaux, case 63
en médaillon central.

```bash
node design/build.mjs
```

La page publiée est assemblée à partir de ces artboards par l'outil de canvas et
n'est pas versionnée, parce qu'elle embarque 2,7 Mo d'éditeur.

## Le monorepo

| Espace de travail   | Rôle                                                                          |
| ------------------- | ----------------------------------------------------------------------------- |
| `packages/engine`   | Les règles pures : plateau, dés, chaîne de résolution. Aucun état réseau      |
| `packages/protocol` | Les types de la vue et les schémas zod qui gardent chaque action client       |
| `apps/server`       | Express et Socket.IO, les salles, les tours et la présence                    |
| `apps/web`          | Le client React : spirale au-dessus de 700 px de conteneur, grille en dessous |

## Licence

ISC.
