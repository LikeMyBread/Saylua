// logic -> Required by Reducers/GameReducer
// --------------------------------------
// Pure functions that calculate complex interactions
// between given inputs for the GameReducer.

import * as MathUtils from "../Utils/math";
import * as FOVUtils from "../Utils/fov";

import { interpretGameEvents } from "./scripting";
import { TILE_SIZE, VISION_RADIUS } from "./GameRenderer";

export const OBSTRUCTIONS = [
  'wall'
];

const MAXIMUM_ENTITY_PROCESSING_DISTANCE = Math.floor(VISION_RADIUS * 3);
const MAXIMUM_TILE_PROCESSING_DISTANCE = Math.floor(VISION_RADIUS * 1.2);


export function calculateFOV(location, tileSet, tileLayer, mapWidth) {
  let validTiles = [];

  let visitTile = (x, y) => {
    validTiles[y] = validTiles[y] || [];
    validTiles[y][x] = true;
  };

  let isBlocked = (x, y) => {
    let linearGlobalPosition = ((y * mapWidth) + x);
    let parentTileID = tileLayer[linearGlobalPosition].tile;
    let parentTileType = tileSet[parentTileID].type;
    return (OBSTRUCTIONS.indexOf(parentTileType) !== -1);
  };

  FOVUtils.calculateFOV(location.x, location.y, VISION_RADIUS, visitTile, isBlocked);

  return validTiles;
}


export function getScreenOffset(options, mapHeight, mapWidth, renderHeight, renderWidth, panOffset, zoomLevel) {
  const TILE_SIZE_SCALED = TILE_SIZE * zoomLevel;
  const max_x = (mapWidth * TILE_SIZE_SCALED) - renderWidth;
  const max_y = (mapHeight * TILE_SIZE_SCALED) - renderHeight;

  let origin = options.location;
  let world_x, world_y;

  // First, we determine our top left coordinate.
  // -- Translate from grid values, if necessary.
  if (options.format === "grid") {
    world_x = origin.x * TILE_SIZE_SCALED;
    world_y = origin.y * TILE_SIZE_SCALED;
  } else {
    world_x = origin.x;
    world_y = origin.y;
  }

  // We treat mouse coordinates separately, as there is no need for centering.
  // Zoom on the hovered point, keeping the underlying tile in-place on screen.
  if (options.type === "mouse") {
    return { "x": world_x, "y": world_y };
  }

  // Finally, we return our coordinate, centered or uncentered.
  if (options.center === true) {
    // Center relative to the screen viewport.
    let centered_x = world_x - (renderWidth / 2);
    let centered_y = world_y - (renderHeight / 2);

    // Snap to the grid.
    //let constrained_x = MathUtils.snap(centered_x, TILE_SIZE_SCALED, max_x);
    //let constrained_y = MathUtils.snap(centered_y, TILE_SIZE_SCALED, max_y);
    let constrained_x = Math.max(0, Math.min(max_x, centered_x));
    let constrained_y = Math.max(0, Math.min(max_y, centered_y));

    return { "x": constrained_x, "y": constrained_y };
  } else {
    return { "x": world_x, "y": world_y };
  }
}


export function translatePlayerLocation(player, tileLayer, tileSet, entityLayer, direction, mapWidth) {
  let p_x, p_y, g_x, g_y, goalCell, goalTile, tileType;

  p_x = player.location.x;
  p_y = player.location.y;

  g_x = p_x;
  g_y = p_y;

  switch(direction) {
    case 'up':
      g_y = p_y - 1;
      break;
    case 'down':
      g_y = p_y + 1;
      break;
    case 'left':
      g_x = p_x - 1;
      break;
    case 'right':
      g_x = p_x + 1;
      break;
  }

  // Determine if we can visit this tile, theoretically.
  try {
    let linearPosition = ((g_y * mapWidth) + g_x);
    goalCell = tileLayer[linearPosition];

    let validTile = (
      (goalCell !== undefined) &&
      (goalCell.location.x === g_x) &&
      (goalCell.location.y === g_y)
    );

    if (!validTile) {
      throw("Invalid location");
    }
  } catch (e) {
    return player.location;
  }

  // Determine if we can go there, physically.
  goalTile = tileSet[goalCell.tile];

  if (OBSTRUCTIONS.indexOf(goalTile.type) !== -1) {
    return player.location;
  }

  // One last check, is there an entity on this tile?
  let targetEntity = entityLayer.filter((entity) => (
    (entity.location.x === g_x) &&
    (entity.location.y === g_y) &&
    (entity.meta.dead !== true)
  ));

  if (targetEntity.length > 0) {
    return {
      'x': player.location.x,
      'y': player.location.y,
      'target': targetEntity[0]
    };
  }

  return { "x": g_x, "y": g_y };
}


export function processAI(tileSet, tileLayer, entitySet, entityLayer, nodeGraph, mapWidth) {
  let playerLocation = entityLayer[0].location;
  let distanceFromPlayer = (newLocation) => {
    return MathUtils.distance(playerLocation, newLocation);
  };

  let referenceEntityLayer = entityLayer;
  let newEntityLayer = entityLayer.slice();
  let newTileLayer = tileLayer.slice();

  // Note that this operates from a copy.
  for (let entity of referenceEntityLayer) {

    // Does this entity still exist?
    // Entities have to determine whether or not they still exist due to cross-interactions.
    let matchingEntity = newEntityLayer.filter((_entity) => (
      (_entity.id == entity.id) &&
      (_entity.meta.dead !== true)
    ));

    if (matchingEntity.length > 0) {
      matchingEntity = matchingEntity[0];

      // Is this entity worth actually processing? These operations are expensive, you know.
      if (distanceFromPlayer(matchingEntity.location) < MAXIMUM_ENTITY_PROCESSING_DISTANCE) {
        [newEntityLayer, newTileLayer] = interpretGameEvents({
          'actionType': 'onIdle',
          'target': matchingEntity,
          'tileSet': tileSet,
          'tileLayer': newTileLayer,
          'entitySet': entitySet,
          'entityLayer': newEntityLayer,
          'nodeGraph': nodeGraph,
          'mapWidth': mapWidth
        });
      }
    }
  }

  for (let tile of newTileLayer) {
    // Should we script this tile?
    if (distanceFromPlayer(tile.location) < MAXIMUM_TILE_PROCESSING_DISTANCE) {
      [newEntityLayer, newTileLayer] = interpretGameEvents({
        'actionType': 'onIdle',
        'target': tile,
        'tileSet': tileSet,
        'tileLayer': newTileLayer,
        'entitySet': entitySet,
        'entityLayer': newEntityLayer,
        'mapWidth': mapWidth
      });
    }
  }

  return [newEntityLayer, newTileLayer];
}
