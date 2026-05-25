// src/ui/sprites.ts
declare const tt: any;

const cache = new Map<string, any>();

export const SPRITE_PATHS = {
  grass: 'assets/sprites/grass_tile.png',
  stone: 'assets/sprites/stone_tile.png',
  house: 'assets/sprites/house_tile.png',
  houseEmpty: 'assets/sprites/house_empty.png',
  start: 'assets/sprites/start_tile.png',
  survivor: 'assets/sprites/survivor_blue.png',
  zombie: 'assets/sprites/zombie_q.png'
};

export type SpriteKey = keyof typeof SPRITE_PATHS;

function loadOne(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = tt.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(new Error(`Failed to load ${path}: ${JSON.stringify(e)}`));
    img.src = path;
  });
}

export async function loadAllSprites(): Promise<void> {
  const entries = Object.entries(SPRITE_PATHS) as [SpriteKey, string][];
  await Promise.all(
    entries.map(async ([key, path]) => {
      cache.set(key, await loadOne(path));
    })
  );
}

export function getSprite(key: SpriteKey): any {
  const s = cache.get(key);
  if (!s) throw new Error(`Sprite not loaded: ${key} — did you await loadAllSprites()?`);
  return s;
}
