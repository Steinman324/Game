import { Config } from './config.js';

export function updateDoors(mapState, player, delta) {
  const doors = mapState.doors;
  for (const key in doors) {
    const door = doors[key];

    // Auto-open when player is close
    if (door.state === Config.DOOR_CLOSED) {
      const dx = door.x + 0.5 - player.x;
      const dy = door.y + 0.5 - player.y;
      if (dx * dx + dy * dy < Config.DOOR_TRIGGER_RANGE * Config.DOOR_TRIGGER_RANGE) {
        door.state = Config.DOOR_OPENING;
      }
    }

    switch (door.state) {
      case Config.DOOR_OPENING:
        door.offset += Config.DOOR_OPEN_SPEED * delta;
        if (door.offset >= 1.0) {
          door.offset = 1.0;
          door.state = Config.DOOR_OPEN;
          door.timer = Config.DOOR_OPEN_TIME;
        }
        break;

      case Config.DOOR_OPEN: {
        // Keep open while player is nearby
        const dx = door.x + 0.5 - player.x;
        const dy = door.y + 0.5 - player.y;
        if (dx * dx + dy * dy < (Config.DOOR_TRIGGER_RANGE * 1.5) ** 2) {
          door.timer = Config.DOOR_OPEN_TIME;
        } else {
          door.timer -= delta;
          if (door.timer <= 0) door.state = Config.DOOR_CLOSING;
        }
        break;
      }

      case Config.DOOR_CLOSING:
        door.offset -= Config.DOOR_OPEN_SPEED * delta;
        if (door.offset <= 0) {
          door.offset = 0;
          door.state = Config.DOOR_CLOSED;
        }
        break;
    }
  }
}

export function resetDoors(mapState) {
  for (const key in mapState.doors) {
    const d = mapState.doors[key];
    d.state = Config.DOOR_CLOSED;
    d.offset = 0;
    d.timer = 0;
  }
}
