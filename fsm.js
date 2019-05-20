import { ACTION_IDENTITY, INIT_EVENT } from "kingly"
import { COMMAND_RENDER } from "react-state-driven"
import { memoize, squareStyling } from "./helpers"

// State monikers
const WHITE_TURN = "WHITE_TURN";
const BLACK_TURN = "BLACK_TURN";
const WHITE_PLAYS = "WHITE_PLAYS";
const WHITE_PIECE_SELECTED = "WHITE_PIECE_SELECTED";
const BLACK_PLAYS = "BLACK_PLAYS";
const BLACK_PIECE_SELECTED = "BLACK_PIECE_SELECTED";
const GAME_OVER = "GAME_OVER";
// State the machine is in before the game starts
// In a real app, the game would start for instance triggered by a url change
const OFF = "OFF";

// Event monikers
const START = "START";
const BOARD_CLICKED = "CLICKED";

// Commands
const MOVE_PIECE = "MOVE_PIECE";

// State update
// Basically {a, b: {c, d}}, [{b:{e}]} -> {a, b:{e}}
// All Object.assign caveats apply
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
function updateState(extendedState, extendedStateUpdates) {
  const extendedStateCopy = Object.assign({}, extendedState);
  return extendedStateUpdates.reduce((acc, x) => Object.assign(acc, x), extendedStateCopy);
}

// Helpers
const IS_WHITE_TURN = 'w';
const IS_BLACK_TURN = 'b';

const events = [BOARD_CLICKED, START];
const states = {
  [OFF]: "",
  [WHITE_TURN]: {
    [WHITE_PLAYS]: "",
    [WHITE_PIECE_SELECTED]: ""
  },
  [BLACK_TURN]: {
    [BLACK_PLAYS]: "",
    [BLACK_PIECE_SELECTED]: ""
  },
  [GAME_OVER]: "",
};
const initialControlState = OFF;
const initialExtendedState = {
  draggable: false,
  turn: IS_WHITE_TURN,
  width: 320,
  // Initial positions of the black and white pieces
  position: 'start',
  whitePiecesPos: [
    "a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
    "a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
  ],
  blackPiecesPos: [
    "a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
    "a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8",
  ],
  // square with the currently clicked piece
  pieceSquare: "",
  // Visual clues
  boardStyle: {
    borderRadius: "5px",
    boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
  },
  squareStyles: {},
};
const transitions = [
  { from: OFF, event: START, to: WHITE_TURN, action: ACTION_IDENTITY },
  // Defining the automatic transition to the initial control state for the compound state WHITE_TURN
  { from: WHITE_TURN, event: INIT_EVENT, to: WHITE_PLAYS, action: displayInitScreen },
  {
    from: WHITE_PLAYS, event: BOARD_CLICKED, guards: [
      { predicate: isWhitePieceClicked, to: WHITE_PIECE_SELECTED, action: highlightWhiteSelectedPiece }
    ]
  },
  {
    from: WHITE_PIECE_SELECTED, event: BOARD_CLICKED, guards: [
      { predicate: isWhitePieceClicked, to: WHITE_PIECE_SELECTED, action: highlightWhiteSelectedPiece },
      { predicate: isLegalNonWinningWhiteMove, to: BLACK_PLAYS, action: moveWhitePiece },
      { predicate: isLegalWinningWhiteMove, to: GAME_OVER, action: endWhiteGame },
    ]
  },
  {
    from: BLACK_PLAYS, event: BOARD_CLICKED, guards: [
      { predicate: isBlackPieceClicked, to: BLACK_PIECE_SELECTED, action: highlightBlackSelectedPiece }
    ]
  },
  {
    from: BLACK_PIECE_SELECTED, event: BOARD_CLICKED, guards: [
      { predicate: isBlackPieceClicked, to: BLACK_PIECE_SELECTED, action: highlightBlackSelectedPiece },
      { predicate: isLegalNonWinningBlackMove, to: WHITE_PLAYS, action: moveBlackPiece },
      { predicate: isLegalWinningBlackMove, to: GAME_OVER, action: endBlackGame },
    ]
  },
];

const gameFsmDef = {
  initialControlState,
  initialExtendedState,
  states,
  events,
  transitions,
  updateState
};

export default gameFsmDef

// Helpers

// Guards
function isWhitePieceClicked (extendedState, eventData){
  const {whitePiecesPos} = extendedState;
  const square = eventData;

  return whitePiecesPos.indexOf(square) > -1
}

function isBlackPieceClicked (extendedState, eventData){
  const {blackPiecesPos} = extendedState;
  const square = eventData;

  return blackPiecesPos.indexOf(square) > -1
}

function isLegalNonWinningMove(extendedState, eventData, settings){
  const {chessEngine} = settings;
  const {pieceSquare} = extendedState;
  const square = eventData;

  const move = chessEngine.move({
    from: pieceSquare,
    to: square,
    promotion: "q"
  });
  const isLegalMove = move != null;
  const hasWon= chessEngine.game_over();
  chessEngine.undo();

  return isLegalMove  && !hasWon
}

function isLegalNonWinningWhiteMove(extendedState, eventData, settings){
  return isLegalNonWinningMove(extendedState, eventData, settings)
}

function isLegalNonWinningBlackMove(extendedState, eventData, settings){
  return isLegalNonWinningMove(extendedState, eventData, settings)
}

function isLegalWinningMove(extendedState, eventData, settings){
  const {chessEngine} = settings;
  const {pieceSquare} = extendedState;
  const square = eventData;

  const move = chessEngine.move({
    from: pieceSquare,
    to: square,
    promotion: "q"
  });
  const isLegalMove = move != null;
  const hasWon= chessEngine.game_over();
  // Undo the effect! We may run this again in the next guard
  // Anyways no effect in guards please!!
  chessEngine.undo();

  return isLegalMove  && hasWon
}

function isLegalWinningWhiteMove(extendedState, eventData, settings){
  return isLegalWinningMove(extendedState, eventData, settings)
}

function isLegalWinningBlackMove(extendedState, eventData, settings){
  return isLegalWinningMove(extendedState, eventData, settings)
}

// Event handlers
const onSquareClickFactory = memoize(function (eventEmitter){
  return function onSquareClick(square) {
    eventEmitter.next({[BOARD_CLICKED]: square})
  }
})

// Actions
function displayInitScreen(extendedState, eventData, settings) {
  const { draggable, width, position, boardStyle, squareStyles } = extendedState;
  const {eventEmitter} = settings;
  const onSquareClick = onSquareClickFactory(eventEmitter);

  return {
    updates: [],
    outputs: [{
      command: COMMAND_RENDER,
      params: { draggable, width, position, boardStyle, squareStyles, onSquareClick }
    }],
  }
}

function highlightWhiteSelectedPiece(extendedState, eventData, settings) {
  const { draggable, width, position, boardStyle } = extendedState;
  const {eventEmitter} = settings;
  const square = eventData;
  const onSquareClick = onSquareClickFactory(eventEmitter);
  const squareStyles = squareStyling({ pieceSquare: square});

  return {
    updates: [
      {squareStyles},
      {pieceSquare: square},
    ],
    outputs: [{
      command: COMMAND_RENDER,
      params: { draggable, width, position, boardStyle, squareStyles, onSquareClick }
    }],
  }
}

function highlightBlackSelectedPiece(extendedState, eventData, settings) {
  return highlightWhiteSelectedPiece(extendedState, eventData, settings)
}

function moveWhitePiece(extendedState, eventData, settings){
  const { draggable, width, boardStyle, pieceSquare:fromSquare, whitePiecesPos: wPP, blackPiecesPos:bPP } = extendedState;
  const {eventEmitter, chessEngine} = settings;
  const square = eventData;
  const onSquareClick = onSquareClickFactory(eventEmitter);
  const squareStyles = '';
  // Remove old white piece position and add new one
  const  whitePiecesPos = wPP.filter(x => x !== fromSquare).concat([square]);
  // Remove old black piece position if any - case when a white piece gobbles a black one
  const  blackPiecesPos = bPP.filter(x => x !== square);

  // Use the chess engine to get the Forsyth–Edwards Notation (`fen`)
  chessEngine.move({from:fromSquare, to: square, promotion:"q"});
  const position = chessEngine.fen();
  chessEngine.undo();

  // As the move is over, reset the piece
  const pieceSquare= "";

  return {
    updates: [
      {pieceSquare},
      {position},
      {squareStyles},
      {whitePiecesPos},
      {blackPiecesPos},
    ],
    outputs: [
      {
        command: COMMAND_RENDER,
        params: { draggable, width, position, boardStyle, squareStyles, onSquareClick }
      },
      {
        command: MOVE_PIECE,
        params: {from: fromSquare, to:square}
      }
    ]
  }
}

function moveBlackPiece(extendedState, eventData, settings){
  const { draggable, width, boardStyle, pieceSquare:fromSquare, whitePiecesPos: wPP, blackPiecesPos:bPP } = extendedState;
  const {eventEmitter, chessEngine} = settings;
  const square = eventData;
  const onSquareClick = onSquareClickFactory(eventEmitter);
  const squareStyles = '';
  // Remove old black piece position and add new one
  const  blackPiecesPos = bPP.filter(x => x !== fromSquare).concat([square]);
  // Remove old white piece position if any - case when a black piece gobbles a white one
  const  whitePiecesPos = wPP.filter(x => x !== square);

  // Use the chess engine to get the Forsyth–Edwards Notation (`fen`)
  chessEngine.move({from:fromSquare, to: square, promotion:"q"});
  const position = chessEngine.fen();
  chessEngine.undo();

  const pieceSquare= "";

  return {
    updates: [
      {pieceSquare},
      {position},
      {squareStyles},
      {whitePiecesPos},
      {blackPiecesPos},
    ],
    outputs: [
      {
        command: COMMAND_RENDER,
        params: { draggable, width, position, boardStyle, squareStyles, onSquareClick }
      },
      {
        command: MOVE_PIECE,
        params: {from: fromSquare, to:square}
      }
    ]
  }
}

function endGame(extendedState, eventData, settings){
  const { draggable, width, boardStyle } = extendedState;
  const {eventEmitter, chessEngine} = settings;
  const square = eventData;
  const onSquareClick = onSquareClickFactory(eventEmitter);
  const squareStyles = '';

  const position = chessEngine.fen();
  const pieceSquare= "";

  return {
    updates: [
      {pieceSquare},
      {position},
      {squareStyles}
    ],
    outputs: [
      {
        command: COMMAND_RENDER,
        params: { draggable, width, position, boardStyle, squareStyles, onSquareClick }
      }
    ]
  }
}

function endWhiteGame(extendedState, eventData, settings) {
  const {updates:u1, outputs:o1} = endGame(extendedState, eventData, settings);
  const {updates:u2, outputs:o2} = moveWhitePiece(extendedState, eventData, settings);

  return {
    updates: u1.concat(u2),
    outputs: o1.concat(o2)
  }
}

function endBlackGame(extendedState, eventData, settings) {
  const {updates:u1, outputs:o1} = endGame(extendedState, eventData, settings);
  const {updates:u2, outputs:o2} = moveBlackPiece(extendedState, eventData, settings);

  return {
    updates: u1.concat(u2),
    outputs: o1.concat(o2)
  }
}
