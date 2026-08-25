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
