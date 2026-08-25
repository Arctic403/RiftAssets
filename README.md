# RiftAssets

RiftAssets is the standalone visual asset lab for RiftCity.

## What it does

- Runs directly on GitHub Pages.
- Uses Babylon.js for a clean isolated 3D preview scene.
- Includes the first 15 stylized low-poly RiftCity assets.
- Click/tap individual parts to edit them.
- Move, rotate and scale with Babylon gizmos.
- Mouse/keyboard shortcuts: `W` move, `E` rotate, `R` scale, arrows nudge, Delete removes, Cmd/Ctrl+Z undo.
- Mobile-friendly library and inspector panels.
- Per-part position, rotation, size, color, roughness and metallic controls.
- Wireframe and bounding-box debugging.
- Local browser drafts.
- Export a single edited asset definition as JSON.
- Save a PNG preview.

## GitHub Pages

In the repository:

1. Open **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`.
4. Save.

The site is static and has no build step.

## Files

- `index.html` — Asset Lab UI.
- `styles.css` — desktop/mobile editor layout.
- `app.js` — preview/editor behavior.
- `assets/definitions.js` — Pack 01 asset definitions.
- `assets/builders.js` — generic data-driven Babylon asset builder.

The goal is for RiftCity to consume the same asset-definition format after an asset has been previewed and tuned here.
