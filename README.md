# RiftAssets → RiftMap 2D

RiftAssets is the **RiftCity 2D World Editor / Reviewer**.

The project has intentionally returned to a pure top-down 2D workflow so the city can be built, reviewed, and expanded much faster. The map data remains structured so a future 2.5D renderer can still consume the same world layout if desired.

## Current workflow

1. District layouts are authored as complete starting maps.
2. RiftMap loads the district as a top-down 2D world.
3. Use the editor to review, move, resize, restyle, and fix objects.
4. WALK mode tests player movement, collision, camera following, and nearby interactions.
5. Exported map JSON is intended to feed the RiftCity game runtime.

## Downtown proof district

The existing Downtown proof is preserved, including roads, buildings, props, lots/zones, interaction markers, player spawn, and gameplay metadata.

## 2D presentation

Downtown now uses `assets/downtown-ground.svg` as its authored ground-art plate. Roads, sidewalks, alleys, grass, plazas, parking/service surfaces, curbs, and road markings are baked into that scalable base artwork. Interactive/editor objects remain separate layers on top.

The renderer now focuses on readable top-down visuals:

- roads, sidewalks, and lane markings,
- building roof silhouettes and roof details,
- shadows and outlines,
- distinct landmark styling,
- trees, parked cars, streetlights, benches, dumpsters, and bus stops,
- day/night preview,
- collision and interaction markers,
- smooth pan/zoom,
- mobile touch and pinch controls.

The current artwork is still a reusable procedural fallback. Building `assetId` values remain in the map so proper 2D sprites/textures can replace the fallback visuals later without rebuilding the city layout.

## Editor tools

- Select / Pan / Road / Building / Prop / Zone / Interaction.
- Mouse, keyboard, iPhone touch, and pinch zoom.
- Grid snapping.
- Move, duplicate, delete, reorder, and nudge.
- Building style and asset ID metadata.
- Collision flags.
- Player spawn placement.
- Layer visibility.
- Undo / redo.
- Local browser drafts.
- Minimap.
- JSON import / paste import / export.
- WALK mode with collision and nearby-interaction detection.

## Map format

Maps continue to use:

```json
{
  "format": "riftcity-2d-map",
  "version": 2,
  "name": "RiftCity — Downtown Proof District",
  "width": 3072,
  "height": 3072,
  "gridSize": 32,
  "playerSpawn": {"x": 1490, "y": 1160},
  "roads": [],
  "buildings": [],
  "props": [],
  "zones": [],
  "interactions": []
}
```

No map conversion is required to continue editing existing version 2 exports.

## Files

- `index.html` — 2D editor/reviewer UI.
- `styles.css` — desktop/mobile interface.
- `app.js` — 2D rendering, editing, walking, collision, import/export.
- `map/default-map.js` — authored Downtown proof and placement palettes.
- `map/world-kit.js` — shared building/prop/interaction style metadata.

Static GitHub Pages project. No build step.
