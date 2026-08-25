# RiftAssets → RiftMap

RiftAssets has been converted into the **RiftCity 2D Map Builder**: a lightweight, GitHub Pages-ready city builder/viewer/editor for designing the walkable 2D/2.5D version of RiftCity.

## What it does

- Large pannable and zoomable 2D city canvas.
- Mouse, keyboard, iPhone touch, and pinch-zoom support.
- Select / pan / road / building / prop / zone / interaction tools.
- Drag roads from start to end.
- Drag building and zone footprints directly on the map.
- Place street props and gameplay interaction markers.
- Layer visibility for roads, lots, buildings, props, zones, and interactions.
- Inspector for position, dimensions, rotation, color, collision, label, and layer.
- Move, duplicate, delete, reorder, and nudge selected objects.
- Grid snapping and adjustable map/grid sizes.
- Local browser draft saving.
- Undo/redo history.
- Minimap and fit-to-map controls.
- Map JSON import, paste import, validation, and export.
- Play-test preview mode with a movable player, basic building/prop collision, and nearby interaction detection.
- Mobile on-screen movement pad for previewing the city.

## Map format

Exports use:

```json
{
  "format": "riftcity-2d-map",
  "version": 1,
  "name": "RiftCity Draft",
  "width": 2048,
  "height": 2048,
  "gridSize": 32,
  "playerSpawn": {"x": 1024, "y": 1024},
  "roads": [],
  "buildings": [],
  "props": [],
  "zones": [],
  "interactions": []
}
```

This is intentionally designed so RiftCity can later consume the same map data for its live 2D city client.

## GitHub Pages

1. Open **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

There is no build step and no external rendering engine.

## Files

- `index.html` — editor UI.
- `styles.css` — desktop/mobile layout.
- `app.js` — map editing, rendering, import/export, and preview logic.
- `map/default-map.js` — starter map, layers, and placement palettes.

The old Babylon/glTF asset-lab files were removed from the active project during the 2D conversion.
