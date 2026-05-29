import { Config } from './config.js';

export function updateDoors(doors, player, delta) {
  for (const key in doors) {
    const d = doors[key];
    const dx = d.x + 0.5 - player.x, dy = d.y + 0.5 - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < Config.DOOR_TRIGGER_DIST && d.state === Config.DOOR_CLOSED) {
      d.state = Config.DOOR_OPENING;
    }

    switch (d.state) {
      case Config.DOOR_OPENING:
        d.offset = Math.min(1.0, d.offset + Config.DOOR_OPEN_SPEED * delta);
        if (d.offset >= 1.0) { d.state = Config.DOOR_OPEN; d.timer = Config.DOOR_OPEN_TIME; }
        break;
      case Config.DOOR_OPEN:
        d.timer -= delta;
        if (d.timer <= 0 && dist > Config.DOOR_TRIGGER_DIST + 0.5) d.state = Config.DOOR_CLOSING;
        break;
      case Config.DOOR_CLOSING:
        d.offset = Math.max(0.0, d.offset - Config.DOOR_OPEN_SPEED * delta);
        if (d.offset <= 0) d.state = Config.DOOR_CLOSED;
        break;
    }
  }
}

export function resetDoors(doors) {
  for (const key in doors) {
    doors[key].state = Config.DOOR_CLOSED;
    doors[key].offset = 0;
    doors[key].timer = 0;
  }
}
