const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 360;
canvas.height = 640;
canvas.style.touchAction = "none";

let gameState = "start";

let player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 40,
  speed: 5,
};

let obstacles = [];
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;

let keys = { left: false, right: false };
let touch = { left: false, right: false };

let startTime = 0;
let survivalTime = 0;
let spawnTimer = 0;

let vibrationEnabled = true;

let resetButton = { x: 10, y: canvas.height - 40, width: 90, height: 30 };
let vibrationButton = { x: 110, y: canvas.height - 40, width: 100, height: 30 };
let skinButton = {
  x: canvas.width - 110,
  y: canvas.height - 40,
  width: 100,
  height: 30,
};

let skins = ["green", "blue", "purple", "orange", "black"];
let currentSkin = parseInt(localStorage.getItem("skinIndex")) || 0;

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener("click", handlePointer);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handlePointer(e.touches[0]);
});

function handlePointer(e) {
  const pos = getPointerPos(e);

  if (gameState === "start" || gameState === "gameover") {
    if (inside(pos.x, pos.y, skinButton)) {
      changeSkin();
      return;
    }
  }

  if (gameState === "gameover") {
    if (inside(pos.x, pos.y, vibrationButton)) {
      vibrationEnabled = !vibrationEnabled;
      return;
    }
    if (inside(pos.x, pos.y, resetButton)) {
      bestScore = 0;
      localStorage.setItem("bestScore", 0);
      return;
    }
    startGame();
    return;
  }

  if (gameState === "start") {
    startGame();
  }

  if (gameState === "playing") {
    if (pos.x < canvas.width / 2) touch.left = true;
    else touch.right = true;
  }
}

canvas.addEventListener("touchend", () => {
  touch.left = false;
  touch.right = false;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(1, "#E0F6FF");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawStart();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === "gameover") {
    drawGameOver();
    requestAnimationFrame(update);
    return;
  }

  survivalTime = Math.floor((Date.now() - startTime) / 1000);
  let difficulty = 1 + survivalTime * 0.05;
  let spawnInterval = Math.max(1000 - survivalTime * 20, 300);

  spawnTimer += 16;
  if (spawnTimer > spawnInterval) {
    spawnObstacle(difficulty);
    spawnTimer = 0;
  }

  if (keys.left || touch.left) player.x -= player.speed;
  if (keys.right || touch.right) player.x += player.speed;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;

  ctx.fillStyle = skins[currentSkin];
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "red";
  obstacles.forEach((o, i) => {
    o.y += o.speed;
    ctx.fillRect(o.x, o.y, o.width, o.height);

    if (collide(player, o)) gameOver();

    if (o.y > canvas.height) {
      obstacles.splice(i, 1);
      score++;
    }
  });

  requestAnimationFrame(update);
}

update();

function startGame() {
  obstacles = [];
  score = 0;
  player.x = canvas.width / 2 - player.width / 2;
  startTime = Date.now();
  spawnTimer = 0;
  gameState = "playing";
}

function gameOver() {
  gameState = "gameover";
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }
  if (navigator.vibrate && vibrationEnabled) {
    navigator.vibrate([100, 50, 200]);
  }
}

function spawnObstacle(difficulty) {
  let size = 30;
  obstacles.push({
    x: Math.random() * (canvas.width - size),
    y: -size,
    width: size,
    height: size,
    speed: 3 * difficulty,
  });
}

function collide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function inside(x, y, btn) {
  return (
    x > btn.x && x < btn.x + btn.width && y > btn.y && y < btn.y + btn.height
  );
}

function changeSkin() {
  currentSkin++;
  if (currentSkin >= skins.length) currentSkin = 0;
  localStorage.setItem("skinIndex", currentSkin);
}

// ---------------- 화면 ----------------

function drawStart() {
  ctx.fillStyle = "white";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("AVOID GAME", canvas.width / 2, 150);

  drawSkinPreview(canvas.height / 2);

  ctx.font = "18px Arial";
  ctx.fillText("터치하면 시작", canvas.width / 2, canvas.height / 2 + 80);

  drawSkinButton();
}

function drawGameOver() {
  ctx.fillStyle = "#E74C3C";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, 120);

  drawSkinPreview(canvas.height / 2 - 20);

  ctx.fillStyle = "#000";
  ctx.font = "18px Arial";
  ctx.fillText("점수: " + score, canvas.width / 2, canvas.height / 2 + 60);
  ctx.fillText(
    "다시 시작하려면 터치",
    canvas.width / 2,
    canvas.height / 2 + 100,
  );

  drawButtons();
}

function drawSkinPreview(centerY) {
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(canvas.width / 2 - 40, centerY - 40, 80, 80);

  ctx.fillStyle = skins[currentSkin];
  ctx.fillRect(canvas.width / 2 - 20, centerY - 20, 40, 40);
}

function drawButtons() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(
    resetButton.x,
    resetButton.y,
    resetButton.width,
    resetButton.height,
  );
  ctx.fillRect(
    vibrationButton.x,
    vibrationButton.y,
    vibrationButton.width,
    vibrationButton.height,
  );
  drawSkinButton();

  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("기록 초기화", resetButton.x + 8, resetButton.y + 20);
  ctx.fillText(
    vibrationEnabled ? "진동: ON" : "진동: OFF",
    vibrationButton.x + 8,
    vibrationButton.y + 20,
  );
}

function drawSkinButton() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(skinButton.x, skinButton.y, skinButton.width, skinButton.height);

  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "스킨 변경",
    skinButton.x + skinButton.width / 2,
    skinButton.y + 20,
  );
}

document.body.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
