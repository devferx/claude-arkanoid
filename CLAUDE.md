# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step or package manager — open `index.html` directly in a browser:

```
open index.html          # macOS
python3 -m http.server   # then visit http://localhost:8000
```

There are no tests, no linter config, and no CI. Manual browser testing is the only verification method.

## Architecture

A static, no-dependency web game. Three source files plus one asset loader:

| File | Role |
|---|---|
| `index.html` | Canvas element (`id="gameCanvas"`, 800×600) + script tags |
| `style.css` | Dark background, canvas centered, `cursor: none` |
| `assets/spritesheet.js` | Loaded first; exposes `loadSpritesheet(cb)` and `drawSprite(ctx, name, x, y, w, h)` |
| `game.js` | All game logic; runs after spritesheet is ready |

**Script load order matters:** `spritesheet.js` must load before `game.js` because `game.js` calls `loadSpritesheet()` and `drawSprite()` which are globals from that file.

### Game loop

`game.js` uses a single `requestAnimationFrame` loop driven by `loop()`. The game state is a single mutable object with a `phase` field:

```
'start' → 'playing' → 'gameover' | 'win' → 'start'
```

- `initState()` resets the full state and sets `phase = 'playing'`.
- `onRestart()` calls `initState()` then sets `phase = 'start'` (returns to start screen, not directly to play).
- `update()` runs physics and collision detection only during `'playing'`.

### Spritesheet API

`drawSprite(ctx, name, x, y, w, h)` maps a name to a region of `assets/spritesheet-breakout.png`:
- `'paddle'`, `'ball'` — direct sprite lookups
- `'block_red'`, `'block_cyan'`, etc. — strips the `'block_'` prefix and looks up in `SPRITES.blocks`

`drawFrame()` and `EXPLOSION_FRAMES` exist in `spritesheet.js` for future explosion animations (not yet wired into `game.js`).

### Physics conventions

- Canvas origin is top-left (0, 0).
- Velocities are in pixels per frame at 60 fps.
- Ball initial velocity: `vx = 3`, `vy = -4`.
- Max safe speed is ~5 px/frame — beyond that, the 16px ball can tunnel through 16px-tall bricks in a single frame. If speed ever increases, switch to swept AABB.
- Brick collision uses overlap comparison (`overlapX < overlapY` → reflect `vx`, else reflect `vy`); only one brick is resolved per frame (`break` after first hit).
- Paddle-ball collision uses center-offset ratio to vary rebound angle: `ratio = offset / (paddleW / 2)` maps to `[-1, 1]`, then `vx = ratio * speed` and `vy` is derived to preserve speed.

### Brick layout

77 bricks (7 rows × 11 cols), built in `initState()`. `BRICK_START_X = (800 - 11*64) / 2 = 48` gives equal left/right margins. Colors assigned per row from `BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray']`.

## Specs

`specs/01-arkanoid-mvp.md` is the authoritative design document for this project. It contains the accepted data model, implementation plan, acceptance criteria, and explicit out-of-scope items (audio, animations, high scores, multiple levels, power-ups, touch controls, pause menu). Check it before adding new features to confirm scope.
