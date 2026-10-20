/**
 * Canonical Emons scene contract for the landing hero.
 *
 * The hero, the illustrated scene layer and the browser acceptance specs must
 * agree on the scene identifiers. Keeping them in one module prevents the hero
 * from shipping chapter ids the scene artwork (and the specs) do not know.
 */
export const EMONS_SCENE_IDS = ['produk', 'packing', 'penghantaran', 'rangkaian'] as const;

export type EmonsSceneId = (typeof EMONS_SCENE_IDS)[number];

/** Number of scroll-driven chapters the hero exposes. */
export const EMONS_SCENE_COUNT = EMONS_SCENE_IDS.length;

/**
 * The editorial product photo belongs to the opening chapter; every later
 * chapter must release the attribution link (focus and pointer) when hidden.
 */
export const EMONS_PRODUCT_PHOTO_SCENE_INDEX = 0;

/** Position of a scene id inside the chapter order, or -1 when unknown. */
export function emonsSceneIndex(id: string): number {
  return EMONS_SCENE_IDS.indexOf(id as EmonsSceneId);
}

/** True when the given chapter index shows the editorial product photo. */
export function isEmonsProductPhotoScene(index: number): boolean {
  return index === EMONS_PRODUCT_PHOTO_SCENE_INDEX;
}

/** True when the given chapter index is the last one and must release native scrolling. */
export function isEmonsLastScene(index: number): boolean {
  return index === EMONS_SCENE_COUNT - 1;
}
