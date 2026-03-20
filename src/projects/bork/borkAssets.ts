import bgFarmyard from "./assets/bg_farmyard.png";
import bgBarn from "./assets/bg_barn.png";
import bgHayField from "./assets/bg_hay_field.png";
import bgWindmillHill from "./assets/bg_windmill_hill.png";
import bgChickenCoop from "./assets/bg_chicken_coop.png";
import bgVegetableGarden from "./assets/bg_vegetable_garden.png";
import bgFarmhousePorch from "./assets/bg_farmhouse_porch.png";

import actorRussToire from "./assets/actor_russ_toire.png";
import actorRussToire_idle_0 from "./assets/actor_russ_toire_idle_0.png";
import actorRussToire_idle_1 from "./assets/actor_russ_toire_idle_1.png";
import actorRussToire_walk_0 from "./assets/actor_russ_toire_walk_0.png";
import actorRussToire_walk_1 from "./assets/actor_russ_toire_walk_1.png";
import actorOldHen from "./assets/actor_old_hen.png";
import actorDuck from "./assets/actor_duck.png";
import actorGoat from "./assets/actor_goat.png";
import actorHens from "./assets/actor_hens.png";
import actorRabbit from "./assets/actor_rabbit.png";
import actorCat from "./assets/actor_cat.png";

import objScarecrow from "./assets/obj_scarecrow.png";
import objCultBucket from "./assets/obj_cult_bucket.png";
import objHayPile from "./assets/obj_hay_pile.png";
import objBarnTools from "./assets/obj_barn_tools.png";
import objHayBale from "./assets/obj_hay_bale.png";
import objFencePost from "./assets/obj_fence_post.png";
import objWindmill from "./assets/obj_windmill.png";
import objWindmillLadder from "./assets/obj_windmill_ladder.png";
import objNestBoxes from "./assets/obj_nest_boxes.png";
import objFeatherPile from "./assets/obj_feather_pile.png";
import objGardenRows from "./assets/obj_garden_rows.png";
import objWateringCan from "./assets/obj_watering_can.png";
import objGloveHook from "./assets/obj_glove_hook.png";
import objPorchChair from "./assets/obj_porch_chair.png";

import itemStrawHat from "./assets/item_straw_hat.png";
import itemLeatherGloves from "./assets/item_leather_gloves.png";
import itemPlaidShirt from "./assets/item_plaid_shirt.png";

/**
 * Stable asset IDs for the Bork sample project.
 * These strings are stored directly in bork.json as backgroundPath / spritePath / iconPath.
 * The engine resolves them at runtime via the assets array below.
 */
export const BORK_ASSET_IDS = {
  bg_farmyard:         "bork_bg_farmyard",
  bg_barn:             "bork_bg_barn",
  bg_hay_field:        "bork_bg_hay_field",
  bg_windmill_hill:    "bork_bg_windmill_hill",
  bg_chicken_coop:     "bork_bg_chicken_coop",
  bg_vegetable_garden: "bork_bg_vegetable_garden",
  bg_farmhouse_porch:  "bork_bg_farmhouse_porch",

  actor_russ_toire:       "bork_actor_russ_toire",
  actor_russ_idle_0:      "bork_actor_russ_idle_0",
  actor_russ_idle_1:      "bork_actor_russ_idle_1",
  actor_russ_walk_0:      "bork_actor_russ_walk_0",
  actor_russ_walk_1:      "bork_actor_russ_walk_1",
  actor_old_hen:     "bork_actor_old_hen",
  actor_duck:        "bork_actor_duck",
  actor_goat:        "bork_actor_goat",
  actor_hens:        "bork_actor_hens",
  actor_rabbit:      "bork_actor_rabbit",
  actor_cat:         "bork_actor_cat",

  obj_scarecrow:       "bork_obj_scarecrow",
  obj_cult_bucket:     "bork_obj_cult_bucket",
  obj_hay_pile:        "bork_obj_hay_pile",
  obj_barn_tools:      "bork_obj_barn_tools",
  obj_hay_bale:        "bork_obj_hay_bale",
  obj_fence_post:      "bork_obj_fence_post",
  obj_windmill:        "bork_obj_windmill",
  obj_windmill_ladder: "bork_obj_windmill_ladder",
  obj_nest_boxes:      "bork_obj_nest_boxes",
  obj_feather_pile:    "bork_obj_feather_pile",
  obj_garden_rows:     "bork_obj_garden_rows",
  obj_watering_can:    "bork_obj_watering_can",
  obj_glove_hook:      "bork_obj_glove_hook",
  obj_porch_chair:     "bork_obj_porch_chair",

  item_straw_hat:      "bork_item_straw_hat",
  item_leather_gloves: "bork_item_leather_gloves",
  item_plaid_shirt:    "bork_item_plaid_shirt",
} as const;

type BorkAsset = {
  id: string;
  name: string;
  dataUrl: string;
  type: "background" | "sprite" | "icon" | "audio" | "other";
  width: number;
  height: number;
};

/**
 * Pre-built assets array for the Bork sample project, shaped to match EditorAsset.
 * dataUrl holds a Vite-resolved PNG URL (not a base64 data: URI, but the engine
 * accepts any image URL in that field).
 * Actual image dimensions (measured from generated PNGs):
 *   backgrounds  → 1408 × 768
 *   sprites/icons → 1024 × 1024
 */
export const BORK_ASSETS: BorkAsset[] = [
  { id: BORK_ASSET_IDS.bg_farmyard,         name: "Farmyard Background",         dataUrl: bgFarmyard,        type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_barn,             name: "Barn Background",             dataUrl: bgBarn,            type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_hay_field,        name: "Hay Field Background",        dataUrl: bgHayField,        type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_windmill_hill,    name: "Windmill Hill Background",    dataUrl: bgWindmillHill,    type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_chicken_coop,     name: "Chicken Coop Background",     dataUrl: bgChickenCoop,     type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_vegetable_garden, name: "Vegetable Garden Background", dataUrl: bgVegetableGarden, type: "background", width: 1408, height: 768 },
  { id: BORK_ASSET_IDS.bg_farmhouse_porch,  name: "Farmhouse Porch Background",  dataUrl: bgFarmhousePorch,  type: "background", width: 1408, height: 768 },

  { id: BORK_ASSET_IDS.actor_russ_toire,  name: "Russ Toire Sprite",          dataUrl: actorRussToire,       type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_russ_idle_0, name: "Russ Toire Idle Frame 0",    dataUrl: actorRussToire_idle_0, type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_russ_idle_1, name: "Russ Toire Idle Frame 1",    dataUrl: actorRussToire_idle_1, type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_russ_walk_0, name: "Russ Toire Walk Frame 0",    dataUrl: actorRussToire_walk_0, type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_russ_walk_1, name: "Russ Toire Walk Frame 1",    dataUrl: actorRussToire_walk_1, type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_old_hen,    name: "Old Hen Sprite",        dataUrl: actorOldHen,    type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_duck,       name: "Duck Sprite",           dataUrl: actorDuck,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_goat,       name: "Sleepy Goat Sprite",    dataUrl: actorGoat,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_hens,       name: "Gossiping Hens Sprite", dataUrl: actorHens,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_rabbit,     name: "Rabbit Sprite",         dataUrl: actorRabbit,    type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.actor_cat,        name: "Cat Sprite",            dataUrl: actorCat,       type: "sprite", width: 1024, height: 1024 },

  { id: BORK_ASSET_IDS.obj_scarecrow,       name: "Scarecrow Sprite",       dataUrl: objScarecrow,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_cult_bucket,     name: "Cult Bucket Sprite",     dataUrl: objCultBucket,     type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_hay_pile,        name: "Hay Pile Sprite",        dataUrl: objHayPile,        type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_barn_tools,      name: "Barn Tools Sprite",      dataUrl: objBarnTools,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_hay_bale,        name: "Hay Bale Sprite",        dataUrl: objHayBale,        type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_fence_post,      name: "Fence Post Sprite",      dataUrl: objFencePost,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_windmill,        name: "Windmill Sprite",        dataUrl: objWindmill,       type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_windmill_ladder, name: "Windmill Ladder Sprite", dataUrl: objWindmillLadder, type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_nest_boxes,      name: "Nest Boxes Sprite",      dataUrl: objNestBoxes,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_feather_pile,    name: "Feather Pile Sprite",    dataUrl: objFeatherPile,    type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_garden_rows,     name: "Garden Rows Sprite",     dataUrl: objGardenRows,     type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_watering_can,    name: "Watering Can Sprite",    dataUrl: objWateringCan,    type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_glove_hook,      name: "Glove Hook Sprite",      dataUrl: objGloveHook,      type: "sprite", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.obj_porch_chair,     name: "Porch Chair Sprite",     dataUrl: objPorchChair,     type: "sprite", width: 1024, height: 1024 },

  { id: BORK_ASSET_IDS.item_straw_hat,      name: "Straw Hat Icon",      dataUrl: itemStrawHat,      type: "icon", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.item_leather_gloves, name: "Leather Gloves Icon", dataUrl: itemLeatherGloves, type: "icon", width: 1024, height: 1024 },
  { id: BORK_ASSET_IDS.item_plaid_shirt,    name: "Plaid Shirt Icon",    dataUrl: itemPlaidShirt,    type: "icon", width: 1024, height: 1024 },
];
