import { Config } from './config.js';

export function updateDoors(doors, delta, playSound) {
  for (const key in doors) {
    const door = doors[key];
    switch (door.state) {
      case Config.DOOR_OPENING:
        if (!door.soundPlayed) {
          if (playSound) playSound('door');
          door.soundPlayed = true;
        }
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
          door.soundPlayed = false;
        }
        break;

      case Config.DOOR_CLOSING:
        if (!door.soundPlayed) {
          if (playSound) playSound('door');
          door.soundPlayed = true;
        }
        door.offset -= Config.DOOR_OPEN_SPEED * delta;
        if (door.offset <= 0) {
          door.offset = 0;
          door.state = Config.DOOR_CLOSED;
          door.soundPlayed = false;
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
    door.soundPlayed = false;
  }
}
