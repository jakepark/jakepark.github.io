# parkjake.com

Personal site, served by GitHub Pages from `master`. Plain HTML, CSS and JS with no build step.

## Run locally

```
python3 -m http.server
```

Then visit http://localhost:8000. A local server is needed because the P-51 model is loaded with `fetch`.

## Files

- `index.html`: the whole page
- `assets/css/site.css`, `assets/js/site.js`: styles, parts list, garage slider, deferred P-51 loading
- `assets/js/p51.js`: WebGL renderer for the P-51 wireframe
- `assets/models/p51.wire`: the baked wireframe
- `models/p51/`: original Maya export of the P-51

## Rebuilding the P-51 wireframe

```
python3 tools/build_wireframe.py models/p51/p51.obj assets/models/p51.wire
```
