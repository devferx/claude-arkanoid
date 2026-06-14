# SPEC 01 — Arkanoid MVP

> **Status:** Implemented · **Depends on:** — · **Date:** 2026-06-14
> **Objective:** Implement a playable Arkanoid game with start screen, game loop, and end screens, served as a static `index.html` using only HTML, CSS, and JS.

---

## Scope

**In:**

- `index.html` — canvas element + script imports.
- `style.css` — page background, canvas centering, cursor style.
- `game.js` — full game logic: game loop, collision detection, scoring, state machine.
- 800×600 `<canvas>` rendering using `assets/spritesheet.js` and `assets/spritesheet-breakout.png`.
- 7 rows × 11 columns brick layout, one brick color per row (red, cyan, green, magenta, yellow, hotpink, gray).
- Paddle controlled by ← → arrow keys and mouse horizontal movement.
- Ball physics: constant speed, angle reflection on paddle/wall/brick hit.
- 3 lives; losing all lives shows a "Game Over" screen with the final score.
- Clearing all bricks shows a "You Win!" screen with the final score.
- Start screen with game title and "Press any key or click to start" prompt.

**Out of scope (for future specs):**

- Audio (bounce and break sounds).
- Brick explosion animations.
- High-score persistence between sessions.
- Multiple levels or level progression.
- Power-ups and special bricks.
- Mobile / touch controls.
- Pause menu.

---

## Data model

```js
// Brick colors in row order (top to bottom)
const BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray'];

// Single brick
// { x, y, w, h, color, alive }

// Game state (single object, mutated each frame)
const state = {
  phase: 'start',      // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  paddle: { x, y, w: 162, h: 14 },
  ball:   { x, y, vx, vy, w: 16, h: 16 },
  bricks: [],          // flat array of brick objects (77 total: 7 rows × 11 cols)
};
```

Conventions:
- Canvas origin: top-left (0, 0).
- Velocities in pixels per frame at 60 fps.

---

## Implementation plan

1. Create `index.html` (canvas element + script tags for `spritesheet.js` and `game.js`),
   and `style.css` (dark page background, canvas centered, `cursor: none` during play).
   Manual test: open in browser → 800×600 dark canvas visible, no console errors.

2. Add `game.js` with the `requestAnimationFrame` loop and start screen: draw title text
   and "Press any key or click to start" on the canvas. Wire keydown/click to transition
   `phase` to `'playing'`.
   Manual test: start screen appears; any key or click advances to a blank canvas.

3. Implement `initState()` and the rendering layer: initialize `state` (paddle, ball, bricks
   array 7×11), call `loadSpritesheet()`, and draw all objects via `drawSprite`. Include
   the HUD (score and lives counter) drawn each frame.
   Manual test: after pressing start, 77 colored bricks, paddle, ball, and HUD are visible.

4. Implement paddle movement: ← → arrow keys and `mousemove` update `paddle.x`, clamped
   to `[0, canvasWidth - paddle.w]`.
   Manual test: paddle follows keyboard and mouse independently.

5. Implement ball movement and wall/ceiling bounce: advance `ball.x += vx`, `ball.y += vy`
   each frame; reflect `vx` on left/right walls, reflect `vy` on ceiling.
   Manual test: ball bounces indefinitely without bricks.

6. Implement paddle-ball collision: when ball bottom touches paddle top, reflect `vy`;
   adjust `vx` proportionally to the offset from the paddle center (center → straight up,
   edges → steeper angle).
   Manual test: hitting paddle at different positions changes the rebound angle.

7. Implement brick-ball collision: AABB check against every alive brick; on hit, reflect
   `vy` (or `vx` for side hits), mark `brick.alive = false`, add 10 to score.
   Manual test: ball destroys bricks; score increments by 10 each hit.

8. Implement life loss and ball reset: when `ball.y > canvasHeight`, decrement `lives`,
   reset ball to center of canvas above the paddle with default velocity; if `lives === 0`,
   set `phase = 'gameover'`.
   Manual test: losing the ball decrements the HUD life counter; zero lives shows game over.

9. Implement win condition: after every brick collision, check whether all bricks have
   `alive === false`; if so, set `phase = 'win'`.
   Manual test: clearing the last brick transitions to the win state.

10. Implement game-over and win screens: draw the appropriate message ("Game Over" or
    "You Win!") and the final score; keydown/click calls `initState()` and sets
    `phase = 'start'`.
    Manual test: full loop — start → play → game over or win → restart resets everything.

---

## Acceptance criteria

- [ ] Opening `index.html` in a browser shows the start screen with no console errors.
- [ ] Pressing any key or clicking transitions to the game screen with 77 bricks, paddle, ball, and HUD visible.
- [ ] Paddle moves left/right with ← → arrow keys, clamped at canvas edges.
- [ ] Paddle follows mouse horizontal position, clamped at canvas edges.
- [ ] Ball bounces off the left wall, right wall, and ceiling.
- [ ] Ball reflects off the paddle; hitting near the edges produces a steeper angle than hitting the center.
- [ ] Each brick hit removes the brick and increments the score by exactly 10.
- [ ] Losing the ball below the canvas decrements the lives counter by 1 and resets the ball above the paddle.
- [ ] Reaching 0 lives shows the "Game Over" screen with the final score.
- [ ] Clearing all 77 bricks shows the "You Win!" screen with the final score.
- [ ] Pressing any key or clicking on the end screens returns to the start screen with score and lives reset.

---

## Decisions

- **Yes:** `<canvas>` for rendering. Cleaner game loop, no DOM layout overhead, straightforward collision detection.
- **No:** DOM-based rendering (absolutely-positioned `<div>` elements). Rejected — layout thrashing and harder collision math.
- **Yes:** Separate files (`index.html`, `style.css`, `game.js`). Easier to spec and extend step by step.
- **No:** Single monolithic `index.html` with embedded JS/CSS. Rejected — harder to maintain.
- **Yes:** 800×600 landscape canvas. User preference; fits a wider monitor layout.
- **No:** 480×640 portrait. Rejected in favor of landscape.
- **Yes:** Fixed brick layout — 7 rows × 11 columns, one color per row matching `BRICK_COLORS`.
- **No:** Randomized brick colors. Rejected — non-deterministic, harder to write acceptance criteria.
- **Yes:** Both keyboard (← →) and mouse controls for the paddle. Trivial to implement, covers more setups.
- **No:** Touch/mobile controls. Deferred — out of scope for MVP.
- **Yes:** 3 lives. Standard Arkanoid convention.
- **Yes:** "You Win!" screen when all bricks cleared; no level progression. Keeps MVP scope tight.
- **No:** Audio and explosion animations. Explicitly deferred from MVP — the assets exist and can be wired in a future spec.
- **No:** High-score persistence. Deferred — can be its own spec using localStorage.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Spritesheet loads after the game loop starts | `game.js` must call `loadSpritesheet(cb)` and only enter the `requestAnimationFrame` loop inside the callback. `drawSprite` silently skips if not loaded, so a missed load produces a blank canvas with no error. |
| Ball tunneling through bricks at high speed | Keep initial ball speed ≤ 5 px/frame. At 60 fps a 16px ball cannot skip a 16px-tall brick in one frame at that speed. If speed is ever increased in a future spec, switch to swept AABB. |

---

## What is **not** in this spec

- Audio (bounce and break sounds).
- Brick explosion animations.
- High-score persistence.
- Multiple levels or level progression.
- Power-ups and special bricks.
- Mobile / touch controls.
- Pause menu.

Each one of those, if it lands, goes in its own spec.
