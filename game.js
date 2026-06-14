const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

let phase = 'start';

function drawStartScreen() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARKANOID', W / 2, H / 2 - 60);

  ctx.font = '24px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Press any key or click to start', W / 2, H / 2 + 20);
}

function loop() {
  if (phase === 'start') {
    drawStartScreen();
  }
  requestAnimationFrame(loop);
}

function onStart() {
  if (phase !== 'start') return;
  phase = 'playing';
}

document.addEventListener('keydown', onStart);
canvas.addEventListener('click', onStart);

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
