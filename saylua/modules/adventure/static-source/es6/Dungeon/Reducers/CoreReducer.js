/* eslint { no-redeclare: 0 } */
// CoreReducer -> Required by Components/DungeonClient.
// --------------------------------------
// Produces outputs from various inputs.
// Holds the actual data that makes up Dungeons.

import "lowlight.astar"; // This injects itself into the window object
window.astar = window.Lowlight.Astar;

import cloneDeep from "lodash.clonedeep";
import { slFetch } from "saylua-fetch";

import * as Scripting from "../Core/scripting";
import * as GameLogic from "../Core/logic";
import * as GameInit from "../Core/init";

import { DebugReducer } from "./DebugReducer";


export function getInitialGameState() {
  let request = slFetch('/api/adventure/generate_dungeon/', {
    "credentials": 'same-origin',
    "method": 'POST',
    "headers": {
      'Content-Type': 'application/json',
    }
  })
    .then(response => response.json())
    .then((result) => {
      let newTileSet = {};
      result.tileSet.map((tile) => {
        newTileSet[tile.id] = tile;
      });

      let newEntitySet = {};
      result.entitySet.map((entity) => {
        newEntitySet[entity.id] = entity;
      });

      // Normalize our tileLayer into a shallow array.
      let [mapHeight, mapWidth, newTileLayer] = GameInit.normalizeTileLayer(result.tileLayer);

      // Initialize entity HP
      let newEntityLayer = GameInit.initializeEntityHP(newEntitySet, result.entityLayer);

      result.mapHeight = mapHeight;
      result.mapWidth = mapWidth;
      result.tileLayer = newTileLayer;
      result.tileSet = newTileSet;
      result.entityLayer = newEntityLayer;
      result.entitySet = newEntitySet;

      let rawNodeGraph = GameInit.generateNodeGraph(result.tileSet, result.tileLayer);
      let graphOptions = {
        'order': "xy",
        'torus': false,     // No grid wrapping
        'diagonals': true,
        'heuristic': 'manhattan',
        'cutting': false,   // No diagonal jumping through walls
        'cost': (a, b) => {
          // Prevent units from being trapped within obstacles.
          if (a.id === b.id) {
            return 0;
          }

          return (b.cost === 0) ? null : b.cost;
        },
        'thread': false
      };

      result.nodeGraph = new window.astar.Configuration(rawNodeGraph, graphOptions);

      result.gameClock = 0;
      result.UI = {
        "canMove": true,
        "showMinimap": false,
        "waitingOnDungeonRequest": false
      };
      result.log = [];

      return result;
    });

  return request;
}

/**
  Perhaps this will be useful in the future for when more than one type of action can move time forward.
  e.g. ranged attacks, 'waiting', using items.
**/
/*export const processAI = store => next => action => {
  // Ensure that if the player moves, all scripted objects resolve their behaviors.
  if (action.type === 'MOVE_PLAYER') {
    store.dispatch({ 'type': 'PROCESS_AI' });
  }

  // Continue as usual.
  let result = next(action);
  return result;
};*/

export const logState = store => next => action => {
  // Before any action, make sure we update from the log queue.
  // This is really not kosher at all.

  // Note that this does not log in real-time, it occurs one step afterwards in game-time.
  if ((window.queue['log'].length > 0) && (window.logging !== true)) {
    window.logging = true;

    let newEvents = window.queue['log'].slice();
    store.dispatch({ 'type': 'LOG_EVENTS', 'events': newEvents });

    window.queue['log'] = [];
    window.logging = false;
  }

  // Continue as usual.
  let result = next(action);
  return result;
};

export const CoreReducer = (state, action) => {
  if (action.type.startsWith("DEBUG")) {
    return DebugReducer(state, action);
  }

  switch (action.type) {
    case 'PROCESS_AI':

      var [entities, tiles] = GameLogic.processAI(state.tileSet, state.tileLayer, state.entitySet, state.entityLayer, state.nodeGraph, state.mapWidth);

      return { ...state, 'entityLayer': entities, 'tileLayer': tiles };

    case 'TRIGGER_EVENT_ENTER':

      var [entities, tiles] = Scripting.interpretGameEvents({
        'actionType': 'onEnter',
        'actionLocation': action.location,
        'nodeGraph': state.nodeGraph,
        'tileSet': state.tileSet,
        'tileLayer': state.tileLayer.slice(),
        'entitySet': state.entitySet,
        'entityLayer': state.entityLayer.slice(),
        'mapWidth': state.mapWidth
      });

      return { ...state, 'entityLayer': entities, 'tileLayer': tiles };

    case 'MOVE_PLAYER':
      var player = cloneDeep(state.entityLayer[0]);
      var entities = state.entityLayer.slice();
      var translation = GameLogic.translatePlayerLocation(player, state.tileLayer, state.tileSet, state.entityLayer, action.direction, state.mapWidth);
      var playerMoved = ((player.location != translation) || (player.target !== undefined));

      // Update our entityLayer copy with the player's new position.
      player.location.x = translation.x;
      player.location.y = translation.y;
      entities[0] = player;

      // Advance game clock by 1 if the player actually moved.
      var newGameClock = state.gameClock;
      newGameClock = playerMoved ? newGameClock + 1 : newGameClock;

      // HACK: This must be removed ASAP.
      /****** begin TEMPORARY CODE, REMOVE ASAP ********/
      // Did we attack something?
      // As a temporary measure, we'll apply the attack manually here.
      if (translation.target !== undefined) {
        var targetEntity = translation.target;

        targetEntity.meta.health = targetEntity.meta.health - 5;

        if (targetEntity.meta.health < 0) {
          // This needs to be replaced with a die() function.
          targetEntity.meta.dead = true;

          // Add weight to our old location
          // Note dirty, uncloned state change
          let targetNode = state.nodeGraph.grid[targetEntity.location.x][targetEntity.location.y];

          if (targetNode.priorWeight !== undefined) {
            targetNode.weight = targetNode.priorWeight;
          } else {
            targetNode.weight = 1;
          }
        }
      }
      /****** end TEMPORARY CODE, REMOVE ASAP ********/

      // All of the below is highly experimental. Questionable syntax.
      var newState = { ...state, 'entityLayer': entities, 'gameClock': newGameClock };

      // Make sure we trigger any entity / tile we collide with
      // newState = CoreReducer(newState, { 'type': 'TRIGGER_EVENT_ENTER', 'location': player.location });

      // Step the game forward one time unit
      newState = CoreReducer(newState, { 'type': 'PROCESS_AI' });
      return newState;

    case 'LOG_EVENTS':

      // This is safe, .concat apparently operates on a copy. JS. So inconsistent.
      var newLog = state.log.concat(action.events);

      return { ...state, 'log': newLog };

    case 'DAMAGE_PLAYER':

      var player = cloneDeep(state.entityLayer[0]);
      var entities = state.entityLayer.slice();

      var damageAmount = action.damage;
      player.meta.health = Math.max(0, (player.meta.health - damageAmount));

      entities[0] = player;

      return { ...state, 'entityLayer': entities };

    case 'DISABLE_MOVEMENT':

      var newUIState = { ...state.UI, 'canMove': false };

      return { ...state, 'UI': newUIState };

    case 'ENABLE_MOVEMENT':

      var newUIState = { ...state.UI, 'canMove': true };

      return { ...state, 'UI': newUIState };

    case 'TOGGLE_MINIMAP':

      var showMinimap = !state.UI.showMinimap;
      var newUIState = { ...state.UI, showMinimap };

      return { ...state, 'UI': newUIState };

    case 'SET_GAME_STATE':
      if (action.state !== undefined) {
        return action.state;
      } else {
        throw("Invalid gameState.");
      }

    default:
      return state;
  }
};
