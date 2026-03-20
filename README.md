# Adventure Engine — Source Code

A reusable browser-based 2D point-and-click adventure game engine
built with TypeScript, React, Vite, and HTML5 Canvas.

## Structure

- `src/engine/`  — Game-agnostic engine layer (rendering, input, pathfinding, scripting)
- `src/editor/`  — Visual editor (room canvas, inspectors, toolbar, project management)
- `src/runtime/` — Game bootstrap (loads project config into engine)
- `src/projects/`— Sample game project data (includes bork.json, the Bork sample project)
- `src/components/`, `src/pages/` — App shell and UI components
- `scripts/`     — CLI tools (e.g. headless playable build export)

## Notes

This archive is a source code snapshot for reference and study.
The project is part of a pnpm monorepo workspace — the included
package.json and tsconfig.json reference workspace dependencies.
To run the project, clone the full workspace or adapt the config
files for standalone use.

Sample game image/audio assets (sprites, backgrounds) are not included
due to file size. The engine generates placeholder art automatically
when image assets are missing, so the editor and game are fully usable
without them.
