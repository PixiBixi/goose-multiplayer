# Changelog
All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -
## [v0.6.1](https://github.com/PixiBixi/goose-multiplayer/compare/5b27093368605ae6cd50f5d4c5acdde078483ae1..v0.6.1) - 2026-09-01
#### Documentation
- (**security**) add a security policy - ([427e8d2](https://github.com/PixiBixi/goose-multiplayer/commit/427e8d2ced5aa1bd4fe3706158b31873cfa1dc6d)) - Jeremy Delgado
#### Continuous Integration
- (**hardening**) audit runner egress and maintain the pinned SHAs - ([5b27093](https://github.com/PixiBixi/goose-multiplayer/commit/5b27093368605ae6cd50f5d4c5acdde078483ae1)) - Jeremy Delgado
- (**renovate**) move dependency updates from Dependabot to Renovate - ([7382a19](https://github.com/PixiBixi/goose-multiplayer/commit/7382a19a83719a822d16167377d46c67ddcd6722)) - Jeremy Delgado
- (**renovate**) drop the config, Dependabot already owns this repo - ([ff7a97b](https://github.com/PixiBixi/goose-multiplayer/commit/ff7a97b8f8ab1fd8d4696318d33f129eb44b10e9)) - Jeremy Delgado
#### Miscellaneous Chores
- (**deps-dev**) bump @types/node in the dev-dependencies group (#1) - ([a361b2a](https://github.com/PixiBixi/goose-multiplayer/commit/a361b2a4a8a392948a5e3c8eb4ef1070b8fa91e4)) - dependabot[bot], dependabot[bot]

- - -

## [v0.6.0](https://github.com/PixiBixi/goose-multiplayer/compare/b26a2bd76b14d63933c04a0a8d760d23aa74bd21..v0.6.0) - 2026-08-25
#### Features
- (**protocol**) carry the running server version in every view - ([5b3d326](https://github.com/PixiBixi/goose-multiplayer/commit/5b3d32684171dfd0f23e06c519c51d5ce89c7f94)) - Jeremy Delgado
- (**server**) stamp the version it is running into every view - ([82f31e8](https://github.com/PixiBixi/goose-multiplayer/commit/82f31e89a86991202e62cb1bc62aecaf9b423af1)) - Jeremy Delgado
- (**web**) tell a stale tab that the server has moved on - ([73f4aca](https://github.com/PixiBixi/goose-multiplayer/commit/73f4acacfa29e24cc3483d4cf95519ec7876ea22)) - Jeremy Delgado
#### Bug Fixes
- (**server**) cache the hashed bundles, keep index.html fresh - ([ece8790](https://github.com/PixiBixi/goose-multiplayer/commit/ece8790a0e0b13abd691fdc17e3dd05e42988c66)) - Jeremy Delgado
- (**web**) degrade on a wire value the bundle has never heard of - ([b26a2bd](https://github.com/PixiBixi/goose-multiplayer/commit/b26a2bd76b14d63933c04a0a8d760d23aa74bd21)) - Jeremy Delgado
#### Documentation
- (**readme**) describe the version banner and the two cache rules - ([bb84a77](https://github.com/PixiBixi/goose-multiplayer/commit/bb84a7791edd44b5fb59fce165479066d207692c)) - Jeremy Delgado
- (**readme**) record that the wire is a version boundary - ([4f3a18c](https://github.com/PixiBixi/goose-multiplayer/commit/4f3a18c91aa0f8d7a26a0591219e70a357627b7f)) - Jeremy Delgado
#### Miscellaneous Chores
- (**scripts**) read the version cog stamps from one place - ([817fd0a](https://github.com/PixiBixi/goose-multiplayer/commit/817fd0a80b9d582fc98bf1198209c74b347ed3db)) - Jeremy Delgado

- - -

## [v0.5.0](https://github.com/PixiBixi/goose-multiplayer/compare/29bb99a198148f6bebc6a38e93bdea00ae395068..v0.5.0) - 2026-08-25
#### Features
- (**engine**) three doors out of the well and the prison - ([29bb99a](https://github.com/PixiBixi/goose-multiplayer/commit/29bb99a198148f6bebc6a38e93bdea00ae395068)) - Jeremy Delgado
- (**protocol**) carry the trap rules and the three exits on the wire - ([8da1ff9](https://github.com/PixiBixi/goose-multiplayer/commit/8da1ff9f27d7324255c387ee4b68fc53b405cde7)) - Jeremy Delgado
- (**server**) project what a blocked seat can still do - ([ae0b2ee](https://github.com/PixiBixi/goose-multiplayer/commit/ae0b2eecda93856d0c18a1f93a6419debe1afbe2)) - Jeremy Delgado
- (**web**) count the trap down on the seat plate, and card the way out - ([9f4c2bd](https://github.com/PixiBixi/goose-multiplayer/commit/9f4c2bdd4984e626aef976aa4cd3383aa2a7fe06)) - Jeremy Delgado
#### Bug Fixes
- (**web**) stop promising a rescuer that is no longer the only way out - ([cd30ebb](https://github.com/PixiBixi/goose-multiplayer/commit/cd30ebb54b69985379e01cf66dcd3c33bb329bf8)) - Jeremy Delgado
#### Documentation
- (**readme**) describe the three ways out and the countdown - ([6abc556](https://github.com/PixiBixi/goose-multiplayer/commit/6abc55696f7e6c57b5e5be60be8bf71964cffd52)) - Jeremy Delgado
- (**spec**) record why the trap has three doors and not one - ([9cb15d8](https://github.com/PixiBixi/goose-multiplayer/commit/9cb15d8557b8362fd1cf71061f5ab0b09ee86ade)) - Jeremy Delgado
#### Tests
- (**scripts**) measure how long a seat stays stuck in the trap - ([3406407](https://github.com/PixiBixi/goose-multiplayer/commit/340640710fda2e832b5e59c19bcd0a77c0d312dc)) - Jeremy Delgado

- - -

## [v0.4.0](https://github.com/PixiBixi/goose-multiplayer/compare/040ddda18ba82f44279e1d18d2ee9ac339fa28e1..v0.4.0) - 2026-08-25
#### Features
- (**engine**) give every rule that fires a step of its own - ([040ddda](https://github.com/PixiBixi/goose-multiplayer/commit/040ddda18ba82f44279e1d18d2ee9ac339fa28e1)) - Jeremy Delgado
- (**protocol**) hold the list of step kinds the wire carries - ([a1b6e47](https://github.com/PixiBixi/goose-multiplayer/commit/a1b6e47702cea8573f6c5427bb4bef386e57583a)) - Jeremy Delgado
- (**web**) a rule card that says why, and a pawn that flies the spiral - ([7336e64](https://github.com/PixiBixi/goose-multiplayer/commit/7336e640b4593a2336d3c026057f262e237397bd)) - Jeremy Delgado
#### Documentation
- (**readme**) describe the rule cards and the flight - ([dc3622c](https://github.com/PixiBixi/goose-multiplayer/commit/dc3622c6e90f34ec5707959f63a0f633d34b4656)) - Jeremy Delgado

- - -

## [v0.3.0](https://github.com/PixiBixi/goose-multiplayer/compare/ed18fff35eb8558c446e44d4d18a04ce2c585599..v0.3.0) - 2026-08-25
#### Features
- (**engine**) grant another roll on a double, capped at three - ([ed18fff](https://github.com/PixiBixi/goose-multiplayer/commit/ed18fff35eb8558c446e44d4d18a04ce2c585599)) - Jeremy Delgado
- (**protocol,server**) carry the doubles rule on the wire and off the timer - ([da5bd31](https://github.com/PixiBixi/goose-multiplayer/commit/da5bd317f4383cd3f8afbdee291af81cc26ebfc7)) - Jeremy Delgado
- (**web**) idle dice, a tumble that lands, and a pawn that walks - ([3cfa1da](https://github.com/PixiBixi/goose-multiplayer/commit/3cfa1da73b6f9d30afe29ff5d358d81b8d14f5f3)) - Jeremy Delgado
#### Bug Fixes
- (**engine**) key the opening nine on the start square, not on the first roll - ([320317b](https://github.com/PixiBixi/goose-multiplayer/commit/320317ba5c4b3fa87afd27c2878ba80d147c7aee)) - Jeremy Delgado
- (**web**) hold the turn on screen until the chain has played - ([377e648](https://github.com/PixiBixi/goose-multiplayer/commit/377e64838e815590c494f28e90bfcbb6c4de9c5a)) - Jeremy Delgado
#### Tests
- (**e2e**) pace the suite off the roll button, not off a stopwatch - ([8bad53e](https://github.com/PixiBixi/goose-multiplayer/commit/8bad53ed57a6e67230ed414c08d00a64437d9e28)) - Jeremy Delgado

- - -

## [v0.2.1](https://github.com/PixiBixi/goose-multiplayer/compare/c1e7d408d1a18720b8a424bf213fd2bba0b1b533..v0.2.1) - 2026-08-25
#### Bug Fixes
- (**format**) let cog own the changelog - ([7497efb](https://github.com/PixiBixi/goose-multiplayer/commit/7497efb6757bac05aef2f06aa3e8423f25f3d053)) - Jeremy Delgado
#### Tests
- (**e2e**) play full two and six player games through traefik - ([c1e7d40](https://github.com/PixiBixi/goose-multiplayer/commit/c1e7d408d1a18720b8a424bf213fd2bba0b1b533)) - Jeremy Delgado

- - -

## [v0.2.0](https://github.com/PixiBixi/goose-multiplayer/compare/v0.1.0..v0.2.0) - 2026-08-25
#### Features
- (**design**) export the artboards to PNG and show them in the README - ([c368865](https://github.com/PixiBixi/goose-multiplayer/commit/c36886570d6af6e4cba227c10c7f4b37fae597c0)) - Jeremy Delgado

- - -

Changelog generated by [cocogitto](https://github.com/cocogitto/cocogitto).