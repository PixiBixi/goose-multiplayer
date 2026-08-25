# goose-multiplayer

Jeu de l'oie en ligne, 2 à 6 joueurs, TypeScript, serveur autoritaire,
auto-hébergé. Rien n'est encore implémenté : ce dépôt ne contient pour l'instant
que le design validé et le plateau dessiné.

## Où en est le projet

| Document | Ce qu'il contient |
| --- | --- |
| [Design](docs/superpowers/specs/2026-08-25-goose-multiplayer-design.md) | Les règles figées, l'architecture, le modèle du tour, les décisions et les alternatives écartées |
| [`design/`](design/) | Les maquettes : table desktop et mobile, salon, cases spéciales |

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

## Ce qui vient ensuite

Le plan d'implémentation, puis le squelette du monorepo :
`packages/engine`, `packages/protocol`, `apps/server`, `apps/web`.

## Licence

ISC.
