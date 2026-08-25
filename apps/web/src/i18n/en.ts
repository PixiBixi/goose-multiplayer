/* Kept key for key against fr.ts, which is the reference the product ships.
   i18n.test.ts fails the build if the two drift apart. */
export const en = {
  'app.title': 'The Game of the Goose',
  'app.tagline': 'Sixty-three squares, two dice, and a great deal of bad faith.',

  'update.title': 'A new version is live.',
  'update.text':
    'This tab is still running the previous one: reload when the game gives you a moment, or some rules may stop showing anything.',
  'update.reload': 'Reload',
  'update.later': 'Later',

  'status.connecting': 'Connecting',
  'status.open': 'Connected',
  'status.closed': 'Connection lost, retrying',

  'home.nameLabel': 'Your name',
  'home.namePlaceholder': 'Jane',
  'home.createTitle': 'Open a table',
  'home.createButton': 'Create a table',
  'home.joinTitle': 'Join a table',
  'home.codeLabel': 'Table code',
  'home.codePlaceholder': 'ABC123',
  'home.joinButton': 'Join',
  'home.nameRequired': 'Enter a name to take a seat.',
  'home.codeRequired': 'The code is six characters, letters and digits.',

  'lobby.title': 'Lobby',
  'lobby.codeLabel': 'Table code',
  'lobby.codeHint': 'Give this code to the other players.',
  'lobby.copy': 'Copy the link',
  'lobby.copied': 'Link copied',
  'lobby.players': 'Players',
  'lobby.host': 'Host',
  'lobby.you': 'you',
  'lobby.start': 'Start the game',
  'lobby.waitingHost': 'The host starts the game once everyone is seated.',
  'lobby.needMore': 'Two players at least are needed to start.',
  'lobby.rulesTitle': 'Table rules',
  'lobby.rulesHostOnly': 'Only the host can change the rules.',

  'rule.exactFinish': 'Exact finish',
  'rule.exactFinishHelp': 'Overshooting square 63 bounces you back.',
  'rule.twoDice': 'Two dice',
  'rule.twoDiceHelp': 'A single die stretches the game and calms the geese.',
  'rule.rescue': 'Rescue',
  'rule.rescueHelp': 'Landing on the well or the prison frees whoever was there.',
  'rule.opening9': 'Opening nine',
  'rule.opening9Help': 'A 9 on the first roll lands on 26 or 53. Needs two dice.',
  'rule.doubleAgain': 'A double rolls again',
  'rule.doubleAgainHelp':
    'A double hands the turn back, three times in a row at most. Needs two dice.',
  'rule.tripleDouble': 'On the third double',
  'rule.tripleDoubleHelp': 'A house rule: three doubles in a row, and the table takes over.',
  'rule.tripleDoublePass': 'The turn passes',
  'rule.tripleDoublePassHelp': 'The seat keeps everything it gained and hands over.',
  'rule.tripleDoubleRestart': 'Back to the start',
  'rule.tripleDoubleRestartHelp': 'The seat starts again from square 0, off the board.',
  'rule.escapeOnDouble': 'A double sets you free',
  'rule.escapeOnDoubleHelp':
    'A blocked seat still rolls: a double lifts it out of the Well or the Prison and moves it on the same roll. Needs two dice.',
  'rule.maxBlockedTurns': 'Let go after',
  'rule.maxBlockedTurnsHelp':
    'A blocked seat lets itself out after that many of its own turns. With no cap only a rescue opens the trap, and the seat usually stays there until the end.',
  'rule.maxBlockedTurnsOne': '1 turn',
  'rule.maxBlockedTurnsMany': '{turns} turns',
  'rule.maxBlockedTurnsNever': 'Never',
  'rule.maxBlockedTurnsNeverHelp':
    'The historic rule: only a rescue opens the Well and the Prison.',

  'die.idle': 'Die, not rolled yet',
  'die.rolling': 'The dice are rolling',

  'table.roll': 'Roll the dice',
  'table.yourTurn': 'Your turn',
  'table.turnOf': "{name}'s turn",
  'table.blockedYou': 'You are stuck, the table plays on without you.',
  'table.blockedTry': 'You are stuck: roll, a double sets you free.',
  'table.leave': 'Leave the table',
  'table.legend': 'Legend',
  'table.log': 'Game log',
  'table.logEmpty': 'Nobody has rolled yet.',
  'table.chat': 'Chat',
  'table.chatPlaceholder': 'A word to the table',
  'table.chatSend': 'Send',
  'table.chatEmpty': 'The quiet before the storm.',
  'table.dice': 'Dice',
  'table.rolled': '{name} rolled {total}',
  'table.seats': 'Players',

  'legend.goose': 'The goose rolls again',
  'legend.move': 'Move',
  'legend.trap': 'Trap',
  'legend.death': 'Death',
  'legend.garden': 'Garden',

  'seat.atStart': 'At the start',
  'seat.atSquare': 'Square {square}',
  'seat.disconnected': 'Disconnected',
  'seat.left': 'Gone',
  'seat.blockedWell': 'In the well',
  'seat.blockedPrison': 'In prison',
  'seat.blockedTryOne': '{trap} · 1 try left',
  'seat.blockedTryMany': '{trap} · {turns} tries left',
  'seat.blockedWaitOne': '{trap} · 1 turn left',
  'seat.blockedWaitMany': '{trap} · {turns} turns left',
  'seat.skip': 'Skips a turn',

  'over.title': 'Game over',
  'over.winner': '{name} reaches the Garden.',
  'over.nobody': 'Nobody reaches the Garden, the table is deadlocked.',
  'over.ranking': 'Ranking',
  'over.again': 'Play again',

  'step.move': 'Roll of {by}: from square {from} to square {to}.',
  'step.opening9': 'Opening nine: {a} and {b} place the pawn on square {to}.',
  'step.goose': 'The goose on square {from} rolls {by} again and flies to square {to}.',
  'step.bounce': 'Square 63 is overshot by {overshoot}: bounce back to square {to}.',
  'step.overshoot':
    'Square 63 is overshot by {overshoot}: with no exact finish, the Garden is reached.',
  'step.bridge': 'The Bridge: on to square {to}.',
  'step.dice': 'The Dice: on to square {to}.',
  'step.maze': 'The Maze: back to square {to}.',
  'step.death': 'Death: back to square {to}.',
  'step.blockedWell': '{name} falls into the Well, square {at}.',
  'step.blockedPrison': '{name} lands in the Prison, square {at}.',
  'step.rescue': '{name} is freed from square {at} and starts again from square {to}.',
  'step.freedWell': '{name} has served the time: the Well lets go after {waited} turns.',
  'step.freedPrison': '{name} has served the sentence: the Prison lets go after {waited} turns.',
  'step.escapeWell': 'Double {face}: {name} climbs out of the Well and moves on the same roll.',
  'step.escapePrison': 'Double {face}: {name} breaks out of the Prison and moves on the same roll.',
  'step.escapeFailedWell': '{name} tries for the double to leave the Well: {a} and {b}, missed.',
  'step.escapeFailedPrison':
    '{name} tries for the double to leave the Prison: {a} and {b}, missed.',
  'step.skip': '{name} lingers at the Inn and skips a turn.',
  'step.double': 'Double {face}: {name} rolls again.',
  'step.triplePass': '{name} rolls a third double, the turn passes.',
  'step.tripleRestart': '{name} rolls a third double and starts over.',
  'step.deadlock': 'Nobody can play any more: the round stops with no winner.',
  'step.win': '{name} reaches the Garden and wins the game.',

  'card.eyebrow': 'Rule',
  'card.dismiss': 'Dismiss the rule card',

  'card.opening9.name': 'The opening nine',
  'card.opening9.why':
    'A 9 on the opening roll goes straight to 26 or 53. Without this rule the geese carry you 9 by 9 to 63 and the game is over before it began.',
  'card.goose.name': 'The Goose',
  'card.goose.why':
    'The thirteen geese are what the game is named after: landing on one rolls the throw again instead of ending it, and a chain can cross half the board.',
  'card.bridge.name': 'The Bridge',
  'card.bridge.why':
    'The Bridge carries you six squares in one go, from 6 to 12: it is the only free shortcut on the board, and it falls early enough to launch a game.',
  'card.dice.name': 'The Dice',
  'card.dice.why':
    'The two dice squares answer each other, 26 to 53 and 53 back to 26. The arrival square fires nothing, or the pawn would shuttle between them for ever.',
  'card.inn.name': 'The Inn',
  'card.inn.why':
    'The Inn costs a turn, not a square: you do not go backwards, you wait, and it is the only trap on the board paid for in time.',
  'card.well.name': 'The Well',
  'card.well.why':
    'The Well does not send you back, it holds you: the pawn keeps its square and pays in turns. Which doors are open is up to the table, and the seat plate always says how much is left to sit out.',
  'card.prison.name': 'The Prison',
  'card.prison.why':
    'The Prison holds you like the Well, but eleven squares from the Garden: landing there so close to the end is the dearest punishment on the board.',
  'card.maze.name': 'The Maze',
  'card.maze.why':
    'You lose your way: the Maze sends you back to square 30 and takes twelve squares off somebody who had just passed halfway.',
  'card.death.name': 'Death',
  'card.death.why':
    'Five squares from the Garden, Death sends you back to square 1 and makes you start over: it is the cruelty the game is after, and it lands just as you thought you had arrived.',
  'card.bounce.name': 'The exact finish',
  'card.bounce.why':
    'You have to land square on 63: the surplus counts backwards and pushes you back by as much, so the last square is won rather than caught by excess.',
  'card.overshoot.name': 'The open finish',
  'card.overshoot.why':
    'This table plays without the exact finish: passing 63 is enough to win, and the surplus is dropped instead of bouncing you back.',
  'card.rescue.name': 'The Rescue',
  'card.rescue.why':
    'The oldest of the three doors: another player falls into the Well or the Prison, takes the place and frees whoever was there. It is the only one that moves two pawns at once.',
  'card.escape.name': 'The freeing double',
  'card.escape.why':
    'A blocked seat still rolls, and a double opens the Well or the Prison: it gets out and moves on the same roll. That double hands back no extra roll, it already paid for the way out.',
  'card.freed.name': 'The capped sentence',
  'card.freed.why':
    'The trap lets its player go after three of their own turns, even if nobody comes. Without that cap, 56% of two player games ended with a seat still at the bottom of the hole: falling in was an elimination, not a setback.',
  'card.double.name': 'The Double',
  'card.double.why':
    'A house rule: a double hands the same seat another roll. Neither the printed board nor any known edition carries it, the game of the goose grants its re-rolls through the goose squares.',
  'card.tripleDouble.name': 'The third double',
  'card.tripleDouble.why':
    'The cap at three exists so a lucky seat cannot hold the table for ever, and because the engine has a termination proof that no added rule may reopen.',
  'card.garden.name': 'The Garden',
  'card.garden.why':
    'Square 63 is the Garden, at the centre of the spiral: it ends the round, and it is the only square on the board that sends you nowhere.',
  'card.deadlock.name': 'Table locked',
  'card.deadlock.why':
    'With rescue off, every seat still in play can end up blocked: the round then stops with no winner rather than waiting on a player who will never move again.',

  'square.plain': 'Square {n}',
  'square.goose': 'Goose',
  'square.bridge': 'The Bridge',
  'square.inn': 'The Inn',
  'square.dice': 'The Dice',
  'square.well': 'The Well',
  'square.maze': 'The Maze',
  'square.prison': 'The Prison',
  'square.death': 'Death',
  'square.garden': 'The Garden',
  'square.label': 'Square {n}, {name}',

  'board.aria': 'Game of the goose board, 63 squares in a spiral',
  'board.start': 'Start',

  'error.rate_limited': 'Too many actions at once. Give it a second.',
  'error.bad_payload': 'The server refused this action.',
  'error.not_in_room': 'You are not seated at any table.',
  'error.create_failed': 'Could not create the table.',
  'error.join_failed': 'Could not join: unknown code, full table, or a game already running.',
  'error.configure_failed': 'The server refused that rule.',
  'error.start_failed': 'Could not start the game.',
  'error.roll_failed': 'Cannot roll right now.',
  'error.chat_failed': 'Message refused.',
  'error.leave_failed': 'Could not leave the table.',
  'error.restart_failed': 'Could not start a rematch.',
  'error.mode_unsupported': 'This table does not run the card variant.',
} satisfies Record<string, string>
