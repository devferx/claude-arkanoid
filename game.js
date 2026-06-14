const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const sfxBounce = new Audio('assets/sounds/ball-bounce.mp3');
const sfxBreak  = new Audio('assets/sounds/break-sound.mp3');

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

const BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray'];

// 3 levels — each is a 7×11 2D array of color strings or null (gap)
const LEVELS = [
  // Level 1 — full grid, horizontal color stripes (identical to original layout)
  [
    ['red',     'red',     'red',     'red',     'red',     'red',     'red',     'red',     'red',     'red',     'red'    ],
    ['cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan',    'cyan'   ],
    ['green',   'green',   'green',   'green',   'green',   'green',   'green',   'green',   'green',   'green',   'green'  ],
    ['magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta', 'magenta'],
    ['yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow',  'yellow' ],
    ['hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink', 'hotpink'],
    ['gray',    'gray',    'gray',    'gray',    'gray',    'gray',    'gray',    'gray',    'gray',    'gray',    'gray'   ],
  ],
  // Level 2 — checkerboard gaps (~35 bricks)
  [
    ['red',     null,      'red',     null,      'red',     null,      'red',     null,      'red',     null,      'red'    ],
    [null,      'cyan',    null,      'cyan',    null,      'cyan',    null,      'cyan',    null,      'cyan',    null     ],
    ['green',   null,      'green',   null,      'green',   null,      'green',   null,      'green',   null,      'green'  ],
    [null,      'magenta', null,      'magenta', null,      'magenta', null,      'magenta', null,      'magenta', null     ],
    ['yellow',  null,      'yellow',  null,      'yellow',  null,      'yellow',  null,      'yellow',  null,      'yellow' ],
    [null,      'hotpink', null,      'hotpink', null,      'hotpink', null,      'hotpink', null,      'hotpink', null     ],
    ['gray',    null,      'gray',    null,      'gray',    null,      'gray',    null,      'gray',    null,      'gray'   ],
  ],
  // Level 3 — full grid, diagonal color rotation (77 bricks, complex pattern)
  [
    ['red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan',    'green',   'magenta'],
    ['cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan',    'green',   'magenta', 'yellow' ],
    ['green',   'magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink'],
    ['magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray'   ],
    ['yellow',  'hotpink', 'gray',    'red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray',    'red'    ],
    ['hotpink', 'gray',    'red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan'   ],
    ['gray',    'red',     'cyan',    'green',   'magenta', 'yellow',  'hotpink', 'gray',    'red',     'cyan',    'green'  ],
  ],
];

const BASE_SPEED      = { vx: 3, vy: -4 };
const SPEED_INCREMENT = 0.5;

const BRICK_COLS   = 11;
const BRICK_ROWS   = 7;
const BRICK_W      = 64;
const BRICK_H      = 24;
const BRICK_START_X = (W - BRICK_COLS * BRICK_W) / 2;  // 48px margin each side
const BRICK_START_Y = 60;

let state = { phase: 'start' };
const keys = {};
let prevTimestamp = 0;

function resetRound() {
  const paddleW = 162;
  const paddleH = 14;
  const ballW   = 16;
  const ballH   = 16;
  const paddleY = H - 50;

  const layout = LEVELS[state.level - 1];
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const color = layout[row][col];
      if (color === null) continue;
      bricks.push({
        x:         BRICK_START_X + col * BRICK_W,
        y:         BRICK_START_Y + row * BRICK_H,
        w:         BRICK_W,
        h:         BRICK_H,
        color,
        alive:     true,
        explosion: null,
      });
    }
  }

  const baseSpeed = Math.hypot(BASE_SPEED.vx, BASE_SPEED.vy);
  const speed     = baseSpeed + (state.level - 1) * SPEED_INCREMENT;
  const ballVx    = (BASE_SPEED.vx / baseSpeed) * speed;
  const ballVy    = (BASE_SPEED.vy / baseSpeed) * speed;

  state.paddle = { x: (W - paddleW) / 2, y: paddleY, w: paddleW, h: paddleH };
  state.ball   = { x: W / 2 - ballW / 2, y: paddleY - ballH - 4, vx: ballVx, vy: ballVy, w: ballW, h: ballH };
  state.bricks = bricks;
}

function initState() {
  state = { phase: 'playing', score: 0, lives: 3, level: 1 };
  resetRound();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function drawStartScreen() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 64px monospace';
  ctx.fillText('ARKANOID', W / 2, H / 2 - 60);

  ctx.fillStyle = '#aaa';
  ctx.font      = '24px monospace';
  ctx.fillText('Press any key or click to start', W / 2, H / 2 + 20);
}

function drawHUD() {
  ctx.font         = '18px monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = '#fff';

  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + state.score, 10, 10);

  ctx.textAlign = 'center';
  ctx.fillText('LVL ' + state.level, W / 2, 10);

  const ballSize = 16;
  const gap = 6;
  for (let i = 0; i < state.lives; i++) {
    const x = W - 10 - (i + 1) * ballSize - i * gap;
    drawSprite(ctx, 'ball', x, 6, ballSize, ballSize);
  }
}

function drawGame() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  for (const b of state.bricks) {
    if (b.alive) {
      drawSprite(ctx, 'block_' + b.color, b.x, b.y, b.w, b.h);
    } else if (b.explosion !== null) {
      drawFrame(ctx, EXPLOSION_FRAMES[b.color][b.explosion.frameIndex], b.x, b.y, b.w, b.h);
    }
  }

  drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  drawSprite(ctx, 'ball',   state.ball.x,   state.ball.y,   state.ball.w,   state.ball.h);

  drawHUD();
}

// ── End screens ──────────────────────────────────────────────────────────────

function drawEndScreen(title) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 64px monospace';
  ctx.fillText(title, W / 2, H / 2 - 60);

  ctx.font      = '28px monospace';
  ctx.fillStyle = '#ff0';
  ctx.fillText('Score: ' + state.score, W / 2, H / 2 + 10);

  ctx.font      = '20px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Press any key or click to restart', W / 2, H / 2 + 60);
}

function drawLevelComplete() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 64px monospace';
  ctx.fillText('Level ' + state.level, W / 2, H / 2 - 60);

  ctx.fillStyle = '#aaa';
  ctx.font      = '24px monospace';
  ctx.fillText('Press any key or click to continue', W / 2, H / 2 + 20);
}

// ── Physics ───────────────────────────────────────────────────────────────────

const PADDLE_SPEED = 7;

function update(dt) {
  const b = state.ball;

  // Paddle keyboard movement
  const p = state.paddle;
  if (keys['ArrowLeft'])  p.x = Math.max(0, p.x - PADDLE_SPEED);
  if (keys['ArrowRight']) p.x = Math.min(W - p.w, p.x + PADDLE_SPEED);

  b.x += b.vx;
  b.y += b.vy;

  // Left / right walls
  if (b.x <= 0) {
    b.x  = 0;
    b.vx = -b.vx;
    playSound(sfxBounce);
  } else if (b.x + b.w >= W) {
    b.x  = W - b.w;
    b.vx = -b.vx;
    playSound(sfxBounce);
  }

  // Ceiling
  if (b.y <= 0) {
    b.y  = 0;
    b.vy = -b.vy;
    playSound(sfxBounce);
  }

  // Brick collisions
  for (const brick of state.bricks) {
    if (!brick.alive) continue;

    const overlapX = Math.min(b.x + b.w, brick.x + brick.w) - Math.max(b.x, brick.x);
    const overlapY = Math.min(b.y + b.h, brick.y + brick.h) - Math.max(b.y, brick.y);

    if (overlapX <= 0 || overlapY <= 0) continue;

    brick.alive = false;
    brick.explosion = { frameIndex: 0, elapsed: 0 };
    state.score += 10;
    playSound(sfxBreak);

    if (overlapX < overlapY) {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
    }

    if (state.bricks.every(bk => !bk.alive)) {
      if (state.level < LEVELS.length) {
        state.level++;
        state.phase = 'level_complete';
      } else {
        state.phase = 'win';
      }
      return;
    }
    break; // one brick per frame
  }

  // Ball lost
  if (b.y > H) {
    state.lives -= 1;
    if (state.lives === 0) {
      state.phase = 'gameover';
      return;
    }
    b.x  = W / 2 - b.w / 2;
    b.y  = p.y - b.h - 4;
    b.vx = 3;
    b.vy = -4;
  }

  // Paddle collision
  if (
    b.vy > 0 &&
    b.y + b.h >= p.y &&
    b.y + b.h <= p.y + p.h &&
    b.x + b.w > p.x &&
    b.x < p.x + p.w
  ) {
    b.y = p.y - b.h;
    const speed  = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const offset = (b.x + b.w / 2) - (p.x + p.w / 2);
    const ratio  = offset / (p.w / 2);           // [-1, 1]
    b.vx = ratio * speed;
    b.vy = -Math.sqrt(Math.max(speed * speed - b.vx * b.vx, 1));
    playSound(sfxBounce);
  }

  // Advance explosion timers
  for (const brick of state.bricks) {
    if (brick.explosion === null) continue;
    brick.explosion.elapsed += dt;
    if (brick.explosion.elapsed >= EXPLOSION_DURATION) {
      brick.explosion = null;
    } else {
      brick.explosion.frameIndex = Math.min(
        Math.floor((brick.explosion.elapsed / EXPLOSION_DURATION) * 4),
        3
      );
    }
  }
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function loop(ts) {
  const dt = Math.min(ts - prevTimestamp, 100);
  prevTimestamp = ts;

  if (state.phase === 'start') {
    drawStartScreen();
  } else if (state.phase === 'playing') {
    update(dt);
    drawGame();
  } else if (state.phase === 'level_complete') {
    drawLevelComplete();
  } else if (state.phase === 'gameover') {
    drawEndScreen('Game Over');
  } else if (state.phase === 'win') {
    drawEndScreen('You Win!');
  }
  requestAnimationFrame(loop);
}

// ── Input ─────────────────────────────────────────────────────────────────────

function onStart() {
  if (state.phase !== 'start') return;
  initState();
}

function onRestart() {
  if (state.phase !== 'gameover' && state.phase !== 'win') return;
  initState();
  state.phase = 'start';
}

function onLevelAdvance() {
  if (state.phase !== 'level_complete') return;
  resetRound();
  state.phase = 'playing';
}

function onKeyDown(e) {
  keys[e.key] = true;
  onRestart();
  onLevelAdvance();
  onStart();
}

function onKeyUp(e) {
  keys[e.key] = false;
}

function onMouseMove(e) {
  if (state.phase !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const p = state.paddle;
  p.x = Math.max(0, Math.min(W - p.w, e.clientX - rect.left - p.w / 2));
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
canvas.addEventListener('click', () => { onRestart(); onLevelAdvance(); onStart(); });
canvas.addEventListener('mousemove', onMouseMove);

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
