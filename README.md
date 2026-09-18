# Sagar — Interactive Developer Room

A browser-based 3D portfolio built with Three.js. Explore projects, experience and skills through an animated room, with a white cat that taps shelf cards to open sections.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open http://localhost:4173.

## Source

- `dist/index.html`: page structure and controls
- `dist/style.css`: responsive styling
- `dist/app.js`: room, characters, animation and portfolio content
- `dist/vendor/three.module.js`: bundled Three.js runtime
- `dist/vendor/LICENSE-three.txt`: Three.js license

The `dist` folder contains the editable static website, not generated build output. Deploy that folder with any static hosting provider. No backend or API keys are required.

Contact, GitHub and LinkedIn destinations currently contain placeholder text; edit the content in `dist/app.js` to add the desired links.
