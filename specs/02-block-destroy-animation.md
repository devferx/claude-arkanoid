# SPEC 02 — Block destroy animation

> **Status:** Approved · **Depends on:** SPEC 01 · **Date:** 2026-06-14
> **Objective:** Wire the existing `EXPLOSION_FRAMES` and `drawFrame()` from
> `spritesheet.js` into `game.js` to play a 4-frame color-matched animation at
> a brick's 64×16 position the moment it is destroyed by the ball.

---

## Scope

**In:**

- Add `explosion: null` to each brick object in `initState()`.
- Change the `loop()` signature to `loop(ts)`, add a module-level `prevTimestamp`
  variable, and compute `dt = ts - prevTimestamp` each frame.
- Pass `dt` into `update(dt)`; advance active explosion timers there.
- On brick hit: set `brick.alive = false` and `brick.explosion = { frameIndex: 0, elapsed: 0 }`.
- In the draw loop: for bricks with `brick.explosion !== null`, call `drawFrame()`
  instead of `drawSprite()`.
- Win/gameover transitions happen immediately; active explosions are abandoned.

**Out of scope (for future specs):**

- Sound effects on brick destruction.
- Particle effects or custom animations not already in the spritesheet.
- Explosion animation when the ball is lost or the paddle is hit.
- Slow-motion or freeze-frame effect on destruction.

---

## Data model

Each brick object gains one new field:

```js
// Before (SPEC 01)
// { x, y, w, h, color, alive }

// After (SPEC 02)
// { x, y, w, h, color, alive, explosion: null | { frameIndex, elapsed } }
```

- `alive: false` is set immediately on hit; `explosion` is cosmetic only.
- `frameIndex` is an integer in `[0, 3]` — index into `EXPLOSION_FRAMES[color]`.
- `elapsed` is wall-clock milliseconds accumulated since the hit.

A module-level variable is added to `game.js`:

```js
let prevTimestamp = 0;
```

No changes to `spritesheet.js`. `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`,
and `drawFrame()` are already defined there.

---

## Implementation plan

1. In `initState()`, add `explosion: null` to each brick object in the brick
   array initialisation loop.
   Manual test: no visual change, game plays normally.

2. Add `let prevTimestamp = 0` at module level in `game.js`. Change `loop()`
   to `loop(ts)`, compute `dt = Math.min(ts - prevTimestamp, 100)` (clamped to
   avoid a huge spike on the very first frame), then set `prevTimestamp = ts`.
   Pass `dt` into `update(dt)`.
   Manual test: no visual change, game plays normally.

3. In the brick-ball collision handler, after setting `brick.alive = false`,
   assign `brick.explosion = { frameIndex: 0, elapsed: 0 }`.
   Manual test: bricks are still destroyed; no animation yet (explosion object
   exists but is not drawn).

4. In `update(dt)`, iterate over all bricks. For each brick where
   `brick.explosion !== null`: add `dt` to `brick.explosion.elapsed`, recompute
   `frameIndex = Math.floor((brick.explosion.elapsed / EXPLOSION_DURATION) * 4)`,
   clamped to `[0, 3]`. If `brick.explosion.elapsed >= EXPLOSION_DURATION`,
   set `brick.explosion = null`.
   Manual test: log `brick.explosion` to the console — it advances and clears
   after ~150 ms.

5. In the draw loop, change the per-brick drawing logic: if `brick.alive`, draw
   `drawSprite(ctx, 'block_' + brick.color, brick.x, brick.y, brick.w, brick.h)`;
   else if `brick.explosion !== null`, call
   `drawFrame(ctx, EXPLOSION_FRAMES[brick.color][brick.explosion.frameIndex], brick.x, brick.y, brick.w, brick.h)`.
   Manual test: destroying a brick shows a brief color-matched animation at the
   brick's 64×16 position before disappearing.

---

## Acceptance criteria

- [ ] Destroying a brick immediately removes it from collision detection; the
      ball passes through the position on the very next frame.
- [ ] A 4-frame color-matched explosion animation plays at the destroyed brick's
      64×16 footprint.
- [ ] The animation lasts approximately 150 ms and then disappears completely.
- [ ] Multiple bricks can explode simultaneously without visual artifacts.
- [ ] Destroying the last brick transitions to the win screen immediately, even
      if explosion animations are still running.
- [ ] `initState()` resets all `brick.explosion` values to `null`; no stale
      animations appear after a restart.
- [ ] No console errors before, during, or after a brick explosion.

---

## Decisions

- **Yes:** Wall-clock milliseconds via rAF timestamp for animation timing —
  frame-rate independent.
- **No:** Render-frame counter — animation duration would vary with frame rate.
- **Yes:** `explosion: { frameIndex, elapsed }` on the brick object — brick
  already carries position; no separate list needed.
- **No:** Separate `state.explosions[]` array — adds indirection without benefit
  at this scale.
- **Yes:** Collision removed immediately on hit (`alive = false`) — animation is
  purely cosmetic; expected player behavior.
- **No:** Keep collision active during animation — non-standard and confusing.
- **Yes:** 64×16 explosion footprint, matching the brick render size.
- **No:** Native 32×16 spritesheet size — would look smaller than the brick,
  visually inconsistent.
- **Yes:** Win/gameover transition is immediate even with active explosions —
  simpler state machine, player gets feedback without delay.
- **No:** Wait for all explosions to finish before transitioning — delays
  feedback, complicates the phase logic.

---

## Risks

| Risk | Mitigation |
|------|------------|
| First rAF frame has `prevTimestamp = 0`, producing a huge `dt` spike that skips all explosion frames instantly. | Clamp `dt` to a maximum of 100 ms: `dt = Math.min(ts - prevTimestamp, 100)`. |

---

## What is **not** in this spec

- Sound effects on brick destruction.
- Particle effects or custom animations not already in the spritesheet.
- Explosion animation when the ball is lost or the paddle is hit.
- Slow-motion or freeze-frame effect on destruction.

Each one of those, if it lands, goes in its own spec.
