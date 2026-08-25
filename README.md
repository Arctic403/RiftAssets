# RiftAssets → RiftMap 2.5D

RiftAssets is now the **RiftCity 2.5D World Reviewer / Map Editor**.

The workflow is intentionally different from a blank level editor:

1. RiftCity districts are authored as complete starting layouts.
2. RiftMap loads the authored district in both plan and 2.5D views.
3. The editor is used to review, move, resize, restyle, and fix the authored layout.
4. The same exported map JSON is designed to be consumed later by the RiftCity game runtime.

## Phase 4 — authored Downtown proof

The default map is now **RiftCity — Downtown Proof District**.

It includes:

- 8 roads and alleys.
- 18 authored buildings.
- 34 street props.
- 10 lot / district / gameplay zones.
- 9 gameplay interaction markers.
- Apartments, shops, offices, a bank, gym, hospital, warehouse, casino, and nightclub.
- Player spawn and walk-test collision.
- Day / night review.
- Procedural 2.5D building façades with floors, windows, storefront glazing, signs, roof equipment, and depth sorting.

The procedural building art is a **fallback visual system**, not the final sprite pack. Every building now carries an `assetId` plus a style and floor count so final transparent sprite artwork can replace the fallback later without rebuilding district layout data.

## Views

### 2.5D

The default review view uses an isometric projection with:

- extruded building massing,
- visible façades,
- floor/window detail,
- roof equipment,
- street props,
- road/sidewalk surfaces,
- depth sorting,
- interaction markers,
- player walk test,
- day/night lighting preview.

Use this view to judge whether the district feels like the game.

### Plan

Plan view keeps precise top-down footprints for layout work:

- roads,
- lots,
- collision footprints,
- buildings,
- zones,
- props,
- interaction positions.

Use PLAN when exact placement matters.

## Editor tools

- Select / Pan / Road / Building / Prop / Zone / Interaction.
- Mouse, keyboard, iPhone touch, and pinch zoom.
- Grid snapping.
- Move, duplicate, delete, reorder, and nudge.
- Building floor count, style, and future `assetId`.
- Collision flags.
- Player spawn placement.
- Layer visibility.
- Undo / redo.
- Local browser drafts.
- Minimap.
- JSON import / paste import / export.
- WALK mode with collision and nearby-interaction detection.

## Map format

The map remains:

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

A building can now include:

```json
{
  "kind": "apartment",
  "floors": 5,
  "style": "brick-warm",
  "assetId": "building.apartment.brick-warm"
}
```

`assetId` is the bridge to the final shared sprite library.

## Files

- `index.html` — reviewer/editor UI.
- `styles.css` — desktop/mobile interface.
- `app.js` — 2D/2.5D rendering, editing, depth sorting, preview, import/export.
- `map/default-map.js` — authored Downtown proof district and editor palettes.
- `map/world-kit.js` — shared building/material/prop/interaction style catalog.

The project stays static and GitHub Pages-ready with no build step and no external rendering engine.
