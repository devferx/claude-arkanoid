const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const BRICK_COLORS = ['red', 'cyan', 'green', 'magenta', 'yellow', 'hotpink', 'gray'];
const BRICK_COLS   = 11;
const BRICK_ROWS   = 7;
const BRICK_W      = 64;
const BRICK_H      = 24;
const BRICK_START_X = (W - BRICK_COLS * BRICK_W) / 2;  // 48px margin each side
const BRICK_START_Y = 60;

let state = { phase: 'start' };
const keys = {};
let prevTimestamp = 0;

function initState() {
  const paddleW = 162;
  const paddleH = 14;
  const ballW   = 16;
  const ballH   = 16;
  const paddleY = H - 50;

  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x:         BRICK_START_X + col * BRICK_W,
        y:         BRICK_START_Y + row * BRICK_H,
        w:         BRICK_W,
        h:         BRICK_H,
        color:     BRICK_COLORS[row],
        alive:     true,
        explosion: null,
      });
    }
  }

  state = {
    phase:  'playing',
    score:  0,
    lives:  3,
    paddle: { x: (W - paddleW) / 2, y: paddleY, w: paddleW, h: paddleH },
    ball:   { x: W / 2 - ballW / 2, y: paddleY - ballH - 4, vx: 3, vy: -4, w: ballW, h: ballH },
    bricks,
  };
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
  ctx.textAlign    = 'left';
  ctx.fillText('Score: ' + state.score, 10, 10);

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
    if (b.alive) drawSprite(ctx, 'block_' + b.color, b.x, b.y, b.w, b.h);
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
  } else if (b.x + b.w >= W) {
    b.x  = W - b.w;
    b.vx = -b.vx;
  }

  // Ceiling
  if (b.y <= 0) {
    b.y  = 0;
    b.vy = -b.vy;
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

    if (overlapX < overlapY) {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
    }

    if (state.bricks.every(bk => !bk.alive)) {
      state.phase = 'win';
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

function onKeyDown(e) {
  keys[e.key] = true;
  onRestart();
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
canvas.addEventListener('click', () => { onRestart(); onStart(); });
canvas.addEventListener('mousemove', onMouseMove);

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
