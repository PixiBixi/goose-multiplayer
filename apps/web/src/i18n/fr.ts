/* The product ships in French: this dictionary is the reference, and en.ts is
   kept key for key against it by i18n.test.ts. */
export const fr = {
  'app.title': "Le Jeu de l'Oie",
  'app.tagline': 'Soixante-trois cases, deux dés, et beaucoup de mauvaise foi.',

  'update.title': 'Nouvelle version en ligne.',
  'update.text':
    'Cet onglet tourne encore sur la précédente : recharge la page quand la partie te le permet, sinon certaines règles risquent de ne plus rien afficher.',
  'update.reload': 'Recharger',
  'update.later': 'Plus tard',

  'status.connecting': 'Connexion en cours',
  'status.open': 'Connecté',
  'status.closed': 'Connexion perdue, nouvelle tentative',

  'home.nameLabel': 'Ton nom',
  'home.namePlaceholder': 'Jeanne',
  'home.createTitle': 'Ouvrir une table',
  'home.createButton': 'Créer une table',
  'home.joinTitle': 'Rejoindre une table',
  'home.codeLabel': 'Code de la table',
  'home.codePlaceholder': 'ABC123',
  'home.joinButton': 'Rejoindre',
  'home.nameRequired': "Entre un nom pour t'asseoir à la table.",
  'home.codeRequired': 'Le code fait six caractères, lettres et chiffres.',

  'lobby.title': 'Salon',
  'lobby.codeLabel': 'Code de la table',
  'lobby.codeHint': 'Donne ce code aux autres joueurs.',
  'lobby.copy': 'Copier le lien',
  'lobby.copied': 'Lien copié',
  'lobby.players': 'Joueurs',
  'lobby.host': 'Hôte',
  'lobby.you': 'toi',
  'lobby.start': 'Commencer la partie',
  'lobby.waitingHost': "L'hôte lance la partie quand tout le monde est assis.",
  'lobby.needMore': 'Il faut au moins deux joueurs pour commencer.',
  'lobby.rulesTitle': 'Règles de la table',
  'lobby.rulesHostOnly': "Seul l'hôte peut changer les règles.",

  'rule.exactFinish': 'Arrivée exacte',
  'rule.exactFinishHelp': 'Un dépassement de la case 63 fait rebondir en arrière.',
  'rule.twoDice': 'Deux dés',
  'rule.twoDiceHelp': 'Un seul dé allonge la partie et calme les oies.',
  'rule.rescue': 'Sauvetage',
  'rule.rescueHelp': 'Arriver au puits ou en prison libère celui qui y était.',
  'rule.opening9': "Neuf d'ouverture",
  'rule.opening9Help': 'Un 9 au premier lancer place en 26 ou en 53. Demande deux dés.',
  'rule.doubleAgain': 'Double rejoue',
  'rule.doubleAgainHelp':
    'Un double redonne la main, trois fois de suite au maximum. Demande deux dés.',
  'rule.tripleDouble': 'Au troisième double',
  'rule.tripleDoubleHelp': "Règle maison : trois doubles d'affilée, et la table reprend la main.",
  'rule.tripleDoublePass': 'Le tour passe',
  'rule.tripleDoublePassHelp': "Le siège garde tout ce qu'il a gagné et rend la main.",
  'rule.tripleDoubleRestart': 'Retour au départ',
  'rule.tripleDoubleRestartHelp': 'Le siège repart de la case 0, hors du plateau.',
  'rule.escapeOnDouble': 'Double libérateur',
  'rule.escapeOnDoubleHelp':
    "Un siège bloqué lance quand même : un double le sort du Puits ou de la Prison et l'avance du même lancer. Demande deux dés.",
  'rule.maxBlockedTurns': 'Sortie au bout de',
  'rule.maxBlockedTurnsHelp':
    "Un siège bloqué sort de lui-même après ce nombre de ses propres tours. Sans plafond, seul un sauvetage l'en sort, et il y reste le plus souvent jusqu'à la fin.",
  'rule.maxBlockedTurnsOne': '1 tour',
  'rule.maxBlockedTurnsMany': '{turns} tours',
  'rule.maxBlockedTurnsNever': 'Jamais',
  'rule.maxBlockedTurnsNeverHelp':
    'La règle historique : seul un sauvetage ouvre le Puits et la Prison.',

  'die.idle': 'Dé, pas encore lancé',
  'die.rolling': 'Les dés roulent',

  'table.roll': 'Lancer les dés',
  'table.yourTurn': 'À toi de jouer',
  'table.turnOf': 'Au tour de {name}',
  'table.blockedYou': 'Tu es bloqué, la table joue sans toi.',
  'table.blockedTry': 'Tu es bloqué : lance les dés, un double te libère.',
  'table.leave': 'Quitter la table',
  'table.legend': 'Légende',
  'table.log': 'Fil de la partie',
  'table.logEmpty': "Personne n'a encore lancé.",
  'table.chat': 'Discussion',
  'table.chatPlaceholder': 'Un mot à la table',
  'table.chatSend': 'Envoyer',
  'table.chatEmpty': 'Le silence avant la tempête.',
  'table.dice': 'Dés',
  'table.rolled': '{name} a fait {total}',
  'table.seats': 'Joueurs',

  'legend.goose': "L'oie relance",
  'legend.move': 'Déplacement',
  'legend.trap': 'Piège',
  'legend.death': 'Mort',
  'legend.garden': 'Jardin',

  'seat.atStart': 'Au départ',
  'seat.atSquare': 'Case {square}',
  'seat.disconnected': 'Déconnecté',
  'seat.left': 'Parti',
  'seat.blockedWell': 'Au puits',
  'seat.blockedPrison': 'En prison',
  'seat.blockedTryOne': '{trap} · encore 1 essai',
  'seat.blockedTryMany': '{trap} · encore {turns} essais',
  'seat.blockedWaitOne': '{trap} · encore 1 tour',
  'seat.blockedWaitMany': '{trap} · encore {turns} tours',
  'seat.skip': 'Passe son tour',

  'over.title': 'Partie terminée',
  'over.winner': '{name} atteint le Jardin.',
  'over.nobody': 'Personne ne rejoint le Jardin, la table est bloquée.',
  'over.ranking': 'Classement',
  'over.again': 'Rejouer',

  'step.move': 'Lancer de {by} : de la case {from} à la case {to}.',
  'step.opening9': "Neuf d'ouverture : {a} et {b} placent le pion en case {to}.",
  'step.goose': "L'oie de la case {from} relance {by} et file en case {to}.",
  'step.bounce': 'La case 63 est dépassée de {overshoot} : rebond en case {to}.',
  'step.overshoot':
    'La case 63 est dépassée de {overshoot} : sans arrivée exacte, le Jardin est atteint.',
  'step.bridge': 'Le Pont : direction la case {to}.',
  'step.dice': 'Les Dés : direction la case {to}.',
  'step.maze': 'Le Labyrinthe : retour en case {to}.',
  'step.death': 'La Mort : retour en case {to}.',
  'step.blockedWell': '{name} tombe dans le Puits, case {at}.',
  'step.blockedPrison': '{name} entre en Prison, case {at}.',
  'step.rescue': '{name} est libéré de la case {at} et repart en case {to}.',
  'step.freedWell': '{name} a fait son temps : le Puits le relâche après {waited} tours.',
  'step.freedPrison': '{name} a purgé sa peine : la Prison le relâche après {waited} tours.',
  'step.escapeWell': 'Double {face} : {name} se hisse hors du Puits et avance dans la foulée.',
  'step.escapePrison':
    'Double {face} : {name} force la porte de la Prison et avance dans la foulée.',
  'step.escapeFailedWell': '{name} tente le double pour sortir du Puits : {a} et {b}, raté.',
  'step.escapeFailedPrison': '{name} tente le double pour sortir de la Prison : {a} et {b}, raté.',
  'step.skip': "{name} s'attarde à l'Auberge et passe son tour.",
  'step.double': 'Double {face} : {name} rejoue.',
  'step.triplePass': '{name} fait un troisième double, le tour passe.',
  'step.tripleRestart': '{name} fait un troisième double et repart du départ.',
  'step.deadlock': "Plus personne ne peut jouer : la manche s'arrête sans vainqueur.",
  'step.win': '{name} atteint le Jardin et gagne la partie.',

  'card.eyebrow': 'Règle',
  'card.dismiss': 'Fermer la fiche de règle',

  'card.opening9.name': "Le neuf d'ouverture",
  'card.opening9.why':
    "Un 9 au premier lancer file en 26 ou en 53. Sans cette règle, les oies de 9 en 9 t'emmènent à 63 et la partie est finie d'entrée.",
  'card.goose.name': "L'Oie",
  'card.goose.why':
    "Les treize oies donnent son nom au jeu : arriver sur l'une d'elles relance le lancer au lieu de l'arrêter, et la chaîne peut traverser la moitié du plateau.",
  'card.bridge.name': 'Le Pont',
  'card.bridge.why':
    "Le Pont fait franchir six cases d'un coup, de la 6 à la 12 : c'est le seul raccourci du plateau qui ne coûte rien, et il tombe assez tôt pour lancer une partie.",
  'card.dice.name': 'Les Dés',
  'card.dice.why':
    "Les deux cases de dés se répondent, de la 26 vers la 53 et de la 53 vers la 26. La case d'arrivée ne redéclenche rien, sinon le pion ferait la navette sans fin.",
  'card.inn.name': "L'Auberge",
  'card.inn.why':
    "L'Auberge coûte un tour et pas une case : on ne recule pas, on attend, et c'est le seul piège du plateau qui se paie en temps.",
  'card.well.name': 'Le Puits',
  'card.well.why':
    'Le Puits ne fait pas reculer, il retient : le pion garde sa case et paie en tours. Les portes de sortie sont réglées par la table, et la plaque du siège dit toujours combien il reste à tenir.',
  'card.prison.name': 'La Prison',
  'card.prison.why':
    "La Prison bloque comme le Puits, mais à onze cases du Jardin : y tomber si près de l'arrivée est la punition la plus chère du plateau.",
  'card.maze.name': 'Le Labyrinthe',
  'card.maze.why':
    "On s'y perd : le Labyrinthe renvoie en case 30 et reprend douze cases à celui qui venait de passer la moitié du parcours.",
  'card.death.name': 'La Mort',
  'card.death.why':
    "À cinq cases du Jardin, La Mort renvoie en case 1 et fait tout recommencer : c'est la cruauté que le jeu cherche, et elle frappe pile quand on se croyait arrivé.",
  'card.bounce.name': "L'arrivée exacte",
  'card.bounce.why':
    "Il faut tomber pile sur 63 : le surplus se compte à l'envers et fait reculer d'autant, pour que la dernière case se gagne au lieu de s'attraper par excès.",
  'card.overshoot.name': "L'arrivée libre",
  'card.overshoot.why':
    "Cette table joue sans l'arrivée exacte : dépasser 63 suffit à gagner, le surplus est perdu au lieu de faire rebondir en arrière.",
  'card.rescue.name': 'Le Sauvetage',
  'card.rescue.why':
    "La plus ancienne des trois portes : un autre joueur tombe dans le Puits ou la Prison, prend la place et libère celui qui y était. C'est la seule qui déplace deux pions d'un coup.",
  'card.escape.name': 'Le double libérateur',
  'card.escape.why':
    'Un siège bloqué lance quand même, et un double ouvre le Puits ou la Prison : il sort et avance du même lancer. Ce double-là ne redonne pas la main, il a déjà payé la sortie.',
  'card.freed.name': 'La peine plafonnée',
  'card.freed.why':
    'Le piège relâche son joueur au bout de trois de ses tours, même si personne ne vient. Sans ce plafond, 56 % des parties à deux se terminaient avec un siège encore au fond du trou : y tomber était une élimination, pas un revers.',
  'card.double.name': 'Le Double',
  'card.double.why':
    "Règle maison : un double redonne la main au même siège. Ni le plateau imprimé ni aucune édition connue ne la contient, les relances du jeu de l'oie viennent des cases oie.",
  'card.tripleDouble.name': 'Le troisième double',
  'card.tripleDouble.why':
    "Le plafond à trois existe pour qu'un siège chanceux ne garde pas la table indéfiniment, et parce que le moteur a une preuve de terminaison qu'aucune règle ajoutée ne doit rouvrir.",
  'card.garden.name': 'Le Jardin',
  'card.garden.why':
    "La case 63 est le Jardin, au centre de la spirale : elle termine la manche, et c'est la seule case du plateau qui ne renvoie nulle part.",
  'card.deadlock.name': 'Table bloquée',
  'card.deadlock.why':
    "Sans sauvetage, tous les sièges encore en jeu peuvent finir bloqués : la manche s'arrête alors sans vainqueur plutôt que d'attendre un joueur qui ne bougera plus.",

  'square.plain': 'Case {n}',
  'square.goose': 'Oie',
  'square.bridge': 'Le Pont',
  'square.inn': "L'Auberge",
  'square.dice': 'Les Dés',
  'square.well': 'Le Puits',
  'square.maze': 'Le Labyrinthe',
  'square.prison': 'La Prison',
  'square.death': 'La Mort',
  'square.garden': 'Le Jardin',
  'square.label': 'Case {n}, {name}',

  'board.aria': "Plateau du jeu de l'oie, 63 cases en spirale",
  'board.start': 'Départ',

  'error.rate_limited': "Trop d'actions d'un coup. Laisse passer une seconde.",
  'error.bad_payload': 'Le serveur a refusé cette action.',
  'error.not_in_room': "Tu n'es assis à aucune table.",
  'error.create_failed': 'Impossible de créer la table.',
  'error.join_failed':
    'Impossible de rejoindre cette table : code inconnu, table pleine ou partie déjà lancée.',
  'error.configure_failed': 'Règle refusée par le serveur.',
  'error.start_failed': 'Impossible de commencer la partie.',
  'error.roll_failed': 'Impossible de lancer les dés maintenant.',
  'error.chat_failed': 'Message refusé.',
  'error.leave_failed': 'Impossible de quitter la table.',
  'error.restart_failed': 'Impossible de relancer une partie.',
  'error.mode_unsupported': 'Cette table ne joue pas la variante avec cartes.',
} satisfies Record<string, string>
