import {render} from "react-dom";
import h from "react-hyperscript";
import { Machine, getEventEmitterAdapter } from "react-state-driven";
import { createStateMachine } from "kingly"
import Chessboard from "chessboardjsx";
import emitonoff from "emitonoff";
import Chess from "chess.js";

import gameFsmDef from "./fsm";
import "./index.css";

const eventEmitter = getEventEmitterAdapter(emitonoff);
const chessEngine = new Chess()
const gameFsm = createStateMachine(gameFsmDef, {
  debug: { console, checkContracts: null },
  // Injecting necessary dependencies
  eventEmitter,
  chessEngine
});

render(
  h(
    Machine,
    {
      fsm: gameFsm,
      eventHandler: eventEmitter,
      // preprocessor: x => x,
      commandHandlers: {
        MOVE_PIECE: function (next, {from, to}, effectHandlers){
          const {chessEngine} = effectHandlers;
          chessEngine.move({
            from,
            to,
            promotion: "q" // always promote to a queen for example simplicity
          });
        }
      },
      effectHandlers: {
        chessEngine
      },
      renderWith: Chessboard,
      options: { initialEvent: { START: void 0 } }
    },
    []
  ),
  document.getElementById("root")
);
