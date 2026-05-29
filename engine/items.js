import { Config } from './config.js';

// Item spawn list — added to map.js ITEM_SPAWNS
export function createItems(spawns) {
  return spawns.map((s, i) => ({
    id: i,
    x: s.x,
    y: s.y,
    type: s.type,
    collected: false,
    bobTimer: Math.random() * Math.PI * 2, // randomize phase so items don't all bob together
  }));
}

export function updateItems(items, player, delta, playSound) {
  let pickedUp = null;
  for (const item of items) {
    if (item.collected) continue;
    item.bobTimer += delta * 3;

    const dx = item.x - player.x;
    const dy = item.y - player.y;
    if (dx * dx + dy * dy < Config.ITEM_PICKUP_DIST * Config.ITEM_PICKUP_DIST) {
      if (item.type === Config.ITEM_HEALTH) {
        if (player.health >= Config.PLAYER_MAX_HEALTH) continue;
        player.health = Math.min(Config.PLAYER_MAX_HEALTH, player.health + Config.ITEM_HEALTH_AMOUNT);
      } else if (item.type === Config.ITEM_AMMO) {
        player.ammo += Config.ITEM_AMMO_AMOUNT;
      }
      item.collected = true;
      if (playSound) playSound('pickup');
      pickedUp = item.type;
    }
  }
  return pickedUp; // null or type string for HUD flash
}

export function buildItemSprites(items, textures) {
  return items
    .filter(i => !i.collected)
    .map(item => ({
      x: item.x,
      y: item.y,
      texture: item.type === Config.ITEM_HEALTH ? textures.healthItem : textures.ammoItem,
      scale: 0.55,
      bobOffset: Math.sin(item.bobTimer) * 0.04, // used by sprite renderer for vertical bob
    }));
}
