import { Config } from './config.js';

export function updateDoors(doors, delta) {
  for (const key in doors) {
    const door = doors[key];
    switch (door.state) {
      case Config.DOOR_OPENING:
        door.offset += Config.DOOR_OPEN_SPEED * delta;
        if (door.offset >= 1.0) {
          door.offset = 1.0;
          door.state = Config.DOOR_OPEN;
          door.timer = Config.DOOR_OPEN_TIME;
        }
        break;

      case Config.DOOR_OPEN:
        door.timer -= delta;
        if (door.timer <= 0) {
          door.state = Config.DOOR_CLOSING;
        }
        break;

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

export function resetDoors(doors) {
  for (const key in doors) {
    const door = doors[key];
    door.state = Config.DOOR_CLOSED;
    door.offset = 0;
    door.timer = 0;
  }
}
