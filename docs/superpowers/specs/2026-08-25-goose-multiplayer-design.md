# Jeu de l'oie multijoueur - Design

- **Date** : 2026-08-25
- **Statut** : sections 1 à 3 validées en conversation ; document rédigé, en attente de relecture avant écriture du plan d'implémentation
- **Origine** : projet neuf. La base technique et les patterns viennent de `uno-multiplayer`, copiés puis adaptés. Aucun couplage de code entre les deux dépôts.
- **Nom** : `goose-multiplayer`, scope npm `@goose/*`, domaine visé `oie.jdelgado.fr`

> Le français est la langue des specs ici, par cohérence avec
> `uno-multiplayer/docs/superpowers/specs/`. Le code, les commentaires et les
> messages de commit restent en anglais.

---

## 1. Objectif et contexte

Jeu de l'oie en ligne, **2 à 6 joueurs**, jouable depuis un navigateur, déployé
en auto-hébergement derrière un Traefik existant. Le trafic attendu est de
quelques tables simultanées. L'URL est publique et sans authentification, donc le
service doit résister aux abus même si l'audience est petite.

### Critères de succès

1. Une partie de 2 à 6 joueurs se déroule de bout en bout sans blocage.
2. Un client ne peut ni choisir son lancer, ni déclarer sa position, ni jouer à
   la place d'un autre.
3. Une déconnexion en cours de partie n'interrompt pas la table : la place est
   gardée, et le joueur retrouve son état en revenant.
4. La chaîne de résolution d'un tour est rejouable et animable : le client sait
   raconter ce qui vient de se passer sans recalculer quoi que ce soit.
5. `npm run verify` et la CI passent, et l'image publiée est celle que le
   pipeline a bootée et sondée.

### Hors périmètre v1

- La variante à cartes action (phase 2, points d'extension posés en v1, voir §8).
- Toute persistance : pas de base, pas de Redis. Un redémarrage perd les parties
  en cours, comme sur `uno-multiplayer`, et c'est un arbitrage assumé.
- Comptes, classements globaux, spectateurs, replays sauvegardés.

---

## 2. Décisions structurantes et alternatives écartées

| Décision | Retenu | Écarté, et pourquoi |
| --- | --- | --- |
| Réutilisation de `uno-multiplayer` | Copie indépendante : on reprend l'infra, la CI, le Dockerfile, les patterns `Room`/`RoomManager`, la forme du protocol et les composants web génériques, puis les deux dépôts divergent librement. | **Package partagé publié** : impose un registry, un versionnage sémantique et un refactor préalable de uno pour deux consommateurs. **Monorepo multi-jeux** : restructure un projet qui tourne en production et double le rayon d'impact de chaque bug. |
| Profondeur de jeu | Règles historiques + panneau de règles de table, la variante à cartes proposée en option de table. | **Classique strict** : partie entièrement déterminée par les dés, aucune rejouabilité, panneau de règles inutile. |
| Phasage de la variante | Phase 2, mais les types et le wire l'accueillent dès la v1. | **Tout en une fois** : on équilibrerait des cartes avant d'avoir joué une partie. **Variante d'abord** : on découvrirait l'infra copiée et des règles inventées en même temps. |
| Format | Manche unique, puis proposition de rejouer à la même table. | **Match en N manches** : demande d'inventer un barème de points qui n'existe pas dans le jeu original. **Classement complet** : les derniers joueraient seuls pendant plusieurs tours. |
| Rendu du plateau | Spirale SVG à géométrie calculée, avec repli sur un serpentin en grille sous une largeur seuil. | **Serpentin seul** : on perd la spirale, qui *est* l'identité du jeu. **Ruban zoomé + minimap** : deux rendus à garder synchrones et perte de la lecture d'ensemble. |
| Direction visuelle | Risographie : encres en surimpression, aplats francs, Archivo Black, ombres portées dures. | **Cabinet d'estampes**, **Circuit nocturne**, **Géométrie stricte** : gardées sur la seconde page du canvas. La risographie est la seule des quatre qui tienne aussi bien à 46 px de case sur mobile qu'en grand. |

Canvas de design : <https://claude.ai/code/artifact/050ddd9e-a02a-4da7-a25b-9f30afdb845f>
(page « Écrans » : table desktop, table mobile, salon, cases spéciales ;
page « Directions écartées » : les trois autres).

---

## 3. Les règles, figées

Le plateau compte 63 cases. Les pions démarrent hors plateau, en position `0`.

### Cases ordinaires

Toutes celles qui ne sont pas listées ci-dessous. Aucun effet.

### Les oies

`5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59`

Arriver sur une oie **relance une avance du même montant que le lancer**. La
chaîne peut s'enchaîner d'oie en oie.

### Les cases à effet

| Case | Nom | Effet |
| --- | --- | --- |
| 6 | Le Pont | Va en 12. |
| 19 | L'Auberge | Passe le prochain tour. |
| 26 | Les Dés | Va en 53. |
| 31 | Le Puits | Bloqué. |
| 42 | Le Labyrinthe | Retour en 30. |
| 52 | La Prison | Bloqué. |
| 53 | Les Dés | Retour en 26. |
| 58 | La Mort | Retour en 1. |
| 63 | Le Jardin | Gagné. |

### Les trois règles de résolution qui garantissent la terminaison

Ce sont des choix, pas des évidences, et ils sont ce qui empêche une partie de
tourner en rond.

1. **L'effet d'une case d'arrivée ne se redéclenche pas.** Un téléport résout une
   fois. Sans cette règle, 26 envoie en 53, qui renvoie en 26, indéfiniment.
2. **Une oie ne se déclenche que sur une avance.** Après un rebond sur 63, aucune
   oie ne s'active. Sans cette règle, rebondir sur une case oie relance une
   avance qui rebondit à nouveau, et la chaîne peut osciller sans fin.
3. **Les autres effets s'appliquent après un rebond.** Rebondir pile sur la Mort
   renvoie bien en case 1 : c'est exactement la cruauté que le jeu cherche, et
   c'est terminant puisque les destinations des téléports sont toutes des cases
   ordinaires.

**Preuve de terminaison.** Une avance est strictement croissante et bornée par
63, donc une chaîne d'oies fait au plus sept sauts. Un rebond survient au plus
une fois par tour, puisqu'après lui aucune oie ne relance d'avance. Un téléport
s'applique au plus une fois par arrivée et sa destination est ordinaire. La
chaîne est donc bornée.

**Filet de sécurité en plus de la preuve** : un plafond de 16 étapes, qui lève
une erreur d'invariant plutôt que de boucler, et une propriété fast-check qui
vérifie sur tous les lancers depuis toutes les cases qu'un tour termine et que la
position finale reste dans `0..63`.

### Les règles de table

Configurables par l'hôte, avant le premier lancer uniquement.

| Règle | Défaut | Effet |
| --- | --- | --- |
| `exactFinish` | activée | Il faut tomber pile sur 63. Le surplus fait rebondir en arrière. Désactivée, on gagne dès qu'on atteint ou dépasse 63. |
| `twoDice` | activée | Deux dés à six faces. Désactivée, un seul dé et la partie dure environ deux fois plus longtemps. |
| `rescue` | activée | Un joueur bloqué au puits ou en prison est libéré quand un autre arrive sur la case et prend sa place. Désactivée, il y reste jusqu'à la fin de la manche. |
| `opening9` | activée | Un 9 au premier lancer envoie directement en 26 si les dés font 6+3, en 53 si 5+4. Activée par défaut parce que sans elle un 9 d'ouverture enchaîne les oies 9, 18, 27, 36, 45, 54 puis 63 et gagne la partie d'emblée. N'a de sens qu'avec `twoDice`. L'interface la désactive et la grise quand `twoDice` est décochée. |
| `mode: 'cards'` | désactivé | La variante à cartes action. Refusée par le serveur en v1 (voir §8). |

### Blocages, attente et ordre du tour

- Le blocage vit dans l'état, pas dans un timer : `blocked: Record<Seat, 'well' | 'prison' | null>`.
- L'attente aussi : `skipTurns: Record<Seat, number>`, décrémenté quand le tour
  passe sur le siège.
- Un siège bloqué ou en attente est sauté. La délivrance est un effet de
  l'arrivée d'un autre joueur sur la case, donc un cas du reducer, testable sans
  horloge.
- Plusieurs pions peuvent occuper la même case. Il n'y a pas de capture, à
  l'exception de la délivrance du puits et de la prison.
- **Cas limite à traiter explicitement** : avec `rescue` désactivée, si tous les
  sièges encore en jeu sont bloqués, la manche se termine sans vainqueur et le
  classement se lit sur les positions. C'est le seul état de partie où personne
  ne peut plus agir, et le reducer doit le détecter plutôt que de laisser la
  table figée.

---

## 4. Architecture

```
packages/engine       pur : aucune I/O, aucun réseau, aucune dépendance
  types.ts            Square, Seat, GameState, Move, Step, TableConfig
  board.ts            les 63 cases comme table de données, pas comme cascade de if
  rng.ts              RNG seedé, repris de uno-multiplayer
  init.ts             création d'un état à partir des sièges et de la config
  reducer.ts          applyRoll et les cas de résolution
  rules.ts            legalMoves
  match.ts            fin de manche, rematch
packages/protocol     events.ts, schemas.ts (Zod), views.ts
apps/server           http.ts, config.ts, logger.ts, security/rate-limit.ts
  rooms/room.ts       synchrone, sans timer
  rooms/room-manager  timers et source d'horloge injectables
  sockets/handlers    un handler par action cliente
apps/web              React : Home, Lobby, Table
  components/BoardSpiral.tsx, BoardGrid.tsx, Die.tsx, Seat.tsx, TableRulesPanel.tsx
```

### Les invariants repris de uno-multiplayer

- **`packages/engine` est pur.** C'est ce qui rend les règles testables,
  rejouables et réutilisables dans un navigateur.
- **`Room` est synchrone et sans timer.** Les timers vivent dans `RoomManager`
  derrière une interface injectable, avec la source d'horloge, pour que les tests
  n'attendent jamais.
- **Numéro de siège == index de siège engine.** Les positions, les blocages et
  les statistiques sont indexés par siège ; casser ça a déjà coûté à un joueur
  toute sa vue de partie sur uno.

### L'invariant qui change de sens

Sur uno, « le client ne connaît aucune règle » protège les mains adverses. Ici
tout est public sur un plateau : il n'y a rien à cacher en v1. L'autorité serveur
sert donc à autre chose, et il faut le dire pour ne pas la sous-traiter par
inadvertance :

1. **Le dé est tiré par le serveur.** Un client ne peut pas choisir son 6.
2. **La position est calculée par le serveur.** Un client ne peut pas déclarer sa
   case, ni son arrivée au jardin.

La forme `legalMoves` dans la vue est conservée malgré sa maigreur en v1
(`['roll']` ou `[]`), parce que c'est elle qui accueille les cartes en phase 2
sans refonte de la vue ni du wire.

---

## 5. Le modèle du tour

Un lancer n'est pas un déplacement, c'est une **chaîne**. Faire 3 depuis la case
3 : on va en 6, le pont envoie en 12. Depuis la case 5 avec un 9 : on va en 14,
une oie, on rejoue le même 9, on arrive en 23, encore une oie, on repart.

```ts
type Step =
  | { kind: 'move'; from: Square; to: Square; by: number }
  | { kind: 'goose'; from: Square; to: Square; by: number }
  | { kind: 'bridge' | 'dice' | 'maze' | 'death'; from: Square; to: Square }
  | { kind: 'bounce'; from: Square; to: Square; overshoot: number }
  | { kind: 'blocked'; at: Square; reason: 'well' | 'prison' }
  | { kind: 'rescue'; seat: Seat; at: Square; to: Square }
  | { kind: 'skip'; turns: number }
  | { kind: 'win'; at: 63 }

applyRoll(state: GameState, dice: number[]): { state: GameState; steps: Step[] }
```

La chaîne complète remonte au client dans la vue. C'est elle qui pilote
l'animation du pion, alimente le fil de partie, et se rejoue telle quelle en
test. Le client n'en dérive aucune règle : il la lit et la met en scène.

`applyRoll` est la seule porte d'entrée du reducer en v1. Le tirage des dés vit
en dehors : `RoomManager` tire via le RNG seedé et passe le résultat, ce qui rend
une partie entière reproductible à partir d'une graine.

---

## 6. Cycle de vie de la table

Repris de `uno-multiplayer` sans changement de forme.

- Code de table à six caractères, rejoignable par le code ou par un lien direct.
- L'hôte est le premier siège occupé. La configuration est modifiable tant que le
  premier lancer n'a pas eu lieu.
- Reconnexion par jeton de session : la place est gardée, l'état est retrouvé.
- Un `restart` remet l'engine à zéro en conservant les sièges et la
  configuration.

### Le timer de tour, spécifique à ce jeu

Un joueur inactif bloque toute la table, et à six joueurs l'attente est déjà le
principal risque de l'expérience. Un tour de jeu de l'oie n'a **qu'une seule
action légale**, donc l'auto-jeu est sans ambiguïté et sans conséquence
stratégique : après 60 secondes, `RoomManager` lance les dés à la place du siège
concerné. C'est la différence assumée avec uno, où auto-jouer une carte serait
une décision à la place du joueur.

Le délai de grâce sur déconnexion reste à 90 secondes, comme sur uno.

---

## 7. Le protocol et la vue

Un ajout d'action cliente demande **quatre** choses, et c'est le handler qui se
fait oublier : un type dans `events.ts`, un schéma Zod dans `schemas.ts`, un
`socket.on` dans `handlers.ts`, et l'émission côté client.

**Client vers serveur** : `createRoom`, `joinRoom`, `configureTable`,
`startGame`, `roll`, `chat`, `leaveRoom`, `restart`, et `playCard` déclaré mais
refusé en v1.

**Serveur vers client** : `tableView`, `error`, `chat`.

```ts
type TableView = {
  code: string
  phase: 'lobby' | 'playing' | 'over'
  config: TableConfig
  you: { seat: Seat; name: string }
  seats: SeatView[]          // nom, présence, position, blocage, attente, couleur
  turn: { seat: Seat; legalMoves: Move[]; deadlineAt?: number }
  lastTurn?: { seat: Seat; dice: number[]; steps: Step[] }
  winner?: Seat
  chat: ChatLine[]
}
```

`lastTurn.steps` est ce qui rend l'animation possible sans dupliquer une seule
règle côté client.

---

## 8. Le point d'extension phase 2

Posé en v1, inerte, et testé comme tel :

- `TableConfig.mode: 'classic' | 'cards'`, `'classic'` en v1.
- `GameState.hands?: Card[][]`, absent en mode classique.
- `SeatView.handCount?` et `PlayerView.hand?`, optionnels.
- L'action `playCard` existe dans `events.ts` et `schemas.ts` ; le handler la
  refuse avec une erreur explicite tant que `mode !== 'cards'`, et un test le
  vérifie.

La v2 ajoute des cas au reducer et des cartes au board. Elle ne redessine ni la
vue, ni le wire, ni le rendu du plateau.

---

## 9. Le rendu du plateau

Deux composants, une seule source de vérité : les 63 positions exportées par
`packages/engine`.

- **`BoardSpiral`** : géométrie calculée, pas dessinée. 62 cases sur une spirale
  à trois tours, pas d'arc et pas radial égaux pour que la bande se lise
  uniformément, case 63 en médaillon central. Les pions sont en orbite autour de
  leur case, pas posés dessus, pour qu'un numéro reste lisible à plusieurs.
- **`BoardGrid`** : serpentin sur sept colonnes, mêmes cases, mêmes couleurs.

La bascule se fait sur la **largeur du conteneur** via `ResizeObserver`, pas sur
une media query : le plateau vit dans une colonne flex à côté d'un rail de chat,
donc la largeur de la fenêtre ne dit rien de la place dont il dispose.

La couleur d'une case dit ce qu'elle fait : oie, mouvement, piège, mort, jardin.
C'est de l'emphase et jamais le message : chaque case porte aussi son icône et
son numéro, parce qu'une couleur seule ne dit rien à un lecteur d'écran ni en
plein soleil.

---

## 10. Tests

| Outil | Ce qu'il prouve |
| --- | --- |
| vitest + fast-check sur `engine` | Les règles. Les propriétés : un tour termine toujours ; la position reste dans `0..63` ; la somme des étapes est cohérente avec l'état final ; aucune chaîne ne dépasse le plafond. |
| vitest sur `protocol` | Les schémas Zod rejettent ce qu'il faut, les vues ne fuient rien. |
| vitest sur `server` | `Room` sans horloge, `RoomManager` avec horloge injectée. Un test par handler, y compris le refus de `playCard`. |
| vitest + Testing Library sur `web` | Les composants, dont la bascule spirale / grille. |
| Playwright | Des parties complètes à 2 et à 6 joueurs, à travers un vrai Traefik. C'est le seul niveau qui prouve que le wire fonctionne : tester les deux bouts d'une chaîne ne prouve rien sur ce qu'il y a entre. |

Le jugement de mise en page se fait en mesurant la géométrie dans un vrai
navigateur, après stabilisation des transitions, jamais en lisant une capture.

---

## 11. CI, image et déploiement

Les trois workflows de `uno-multiplayer` sont copiés et adaptés : qualité
(lint, `format:check`, typecheck, build), tests avec couverture, e2e, puis
publication de l'image sur push vert sur `main`. L'image publiée est celle que le
pipeline a bootée et sondée.

- Node épinglé dans `.nvmrc`. Une étape CI échoue si le `Dockerfile` et le
  `.nvmrc` divergent : c'est comme ça que l'image de uno a un jour embarqué une
  version que rien d'autre ne validait.
- `npm run verify` avant chaque commit, et le hook pre-commit pour Prettier et
  ESLint sur les fichiers indexés. Les deux couvrent des trous opposés et aucun
  ne remplace l'autre.
- `cog.toml`, Conventional Commits, un commit par scope.
- Un `dist/` périmé signifie un client neuf qui parle à un serveur ancien.
- **Une seule réplique, toujours.** L'état vit en mémoire et il n'y a pas
  d'adaptateur Redis : deux processus tiendraient chacun la moitié des tables
  sans le savoir.
- Derrière Traefik : `BEHIND_TLS=true`, pas de mapping `ports:`, réseau en
  `external: true`.

---

## 12. Risques

1. **La minceur du jeu.** Le classique n'offre aucune décision. C'est le risque
   principal du projet, et la variante à cartes est sa réponse. Si la v1 n'est
   pas amusante à six, c'est un signal à prendre au sérieux plutôt qu'à contourner
   par des options.
2. **L'attente à six joueurs.** Atténuée par des tours très courts, l'auto-lancer
   après 60 secondes, et le fait que la chaîne de résolution soit spectaculaire à
   regarder. À vérifier sur une vraie partie avant d'ouvrir plus grand.
3. **Les règles de résolution du §3 sont des choix de maison.** Elles rendent le
   jeu terminant, mais elles ne sont pas « les » règles officielles, qui varient
   d'une édition à l'autre. Elles doivent être visibles dans l'interface, pas
   seulement dans ce document.
