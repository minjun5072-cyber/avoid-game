const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 세로모드 비율
canvas.width = 360;
canvas.height = 640;

let gameState = "start"; //게임 상태 변수

let player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 40,
  speed: 5,
};

let obstacles = [];
let score = 0;

let keys = {
  left: false,
  right: false,
}; //키 상태 변수 추가

let touch = {
  left: false,
  right: false,
}; //터치 상태 변수 추가


let startTime = 0;
let survivalTime = 0;//타이머 변수 추가

let obstacleInterval;//장애물 변수 추가

let bestScore = localStorage.getItem("bestScore") || 0;//최고기록 변수 추가

let spawnTimer = 0;//생성 타이머 변수 추가

let vibrationButton = {
  x: 110,
  y: canvas.height - 35,
  width: 90,
  height: 25
};//진동 끄기 버튼 변수 추가

let resetButton = {
  x: 10,
  y: canvas.height - 35,
  width: 90,
  height: 25,
};//최고기록 초기화 변수 추가

let vibrationEnabled = true;//진동 끄기 변수 추가

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (gameState === "gameover") {
    // 🔹 1️⃣ 진동 버튼 먼저 체크
    if (
      mouseX > vibrationButton.x &&
      mouseX < vibrationButton.x + vibrationButton.width &&
      mouseY > vibrationButton.y &&
      mouseY < vibrationButton.y + vibrationButton.height
    ) {
      vibrationEnabled = !vibrationEnabled;
      return; // 🔥 여기 중요
    }

    // 🔹 2️⃣ 기록 초기화 버튼
    if (
      mouseX > resetButton.x &&
      mouseX < resetButton.x + resetButton.width &&
      mouseY > resetButton.y &&
      mouseY < resetButton.y + resetButton.height
    ) {
      bestScore = 0;
      localStorage.setItem("bestScore", 0);
      return;
    }

    // 🔹 3️⃣ 다시 시작 버튼
    startGame();
  }

  if (gameState === "start") {
    startGame();
  }
});

// 터치 이동
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  const touchY = e.touches[0].clientY - rect.top;

  if (gameState === "gameover") {
    // 🔹 1. 진동 버튼 체크
    if (
      touchX > vibrationButton.x &&
      touchX < vibrationButton.x + vibrationButton.width &&
      touchY > vibrationButton.y &&
      touchY < vibrationButton.y + vibrationButton.height
    ) {
      vibrationEnabled = !vibrationEnabled;
      return; // 여기 꼭 필요
    }

    // 🔹 2. 기록 초기화 버튼 체크
    if (
      touchX > resetButton.x &&
      touchX < resetButton.x + resetButton.width &&
      touchY > resetButton.y &&
      touchY < resetButton.y + resetButton.height
    ) {
      bestScore = 0;
      localStorage.setItem("bestScore", 0);
      return; // 여기 꼭 필요
    }

    // 🔹 3. 나머지는 다시 시작
    startGame();
    return;
  }

  // 🔹 게임 시작 화면 터치
  if (gameState === "start") {
    startGame();
    return;
  }

  // 🔹 플레이 중 이동 처리
  if (touchX < rect.width / 2) {
    touch.left = true;
    touch.right = false;
  } else {
    touch.right = true;
    touch.left = false;
  }
});

// 키보드 이동 (PC 테스트용)
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

// 장애물 생성
function spawnObstacle() {
  let size = 30;
  let difficulty = 1 + survivalTime * 0.05;

  // 시간이 지나면 한 번에 여러 개 생성
  let count = 1 + Math.floor(survivalTime / 10);

  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: Math.random() * (canvas.width - size),
      y: -size,
      width: size,
      height: size,
      speed: 3 * difficulty,
    });
  }
}

// 충돌 체크
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(1, "#E0F6FF");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (gameState === "start") {
    drawStartScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === "gameover") {
    drawGameOverScreen();
    requestAnimationFrame(update);
    return;
  }

  // 난이도 계산
  let difficulty = 1 + survivalTime * 0.05;

  // 생성 간격 (점점 줄어듦, 최소 300ms)
  let spawnInterval = Math.max(1000 - survivalTime * 20, 300);

  spawnTimer += 16; // 약 60fps 기준

  if (spawnTimer > spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }

  if (gameState === "playing") {
    survivalTime = Math.floor((Date.now() - startTime) / 1000);
  }

  // ✅ 1. 이동 먼저
  if (keys.left || touch.left) {
    player.x -= player.speed;
  }

  if (keys.right || touch.right) {
    player.x += player.speed;
  }

  // ✅ 2. 벽 제한 (이게 핵심)
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // ✅ 3. 플레이어 그리기
  ctx.fillStyle = "green";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 점수 (상단 중앙)
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, 50);

  ctx.fillStyle = "white";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Score: " + score, canvas.width / 2, 30);

  ctx.textAlign = "left";
  ctx.fillText("Time: " + survivalTime + "s", 10, 30);

  ctx.textAlign = "right";
  ctx.fillText("BEST: " + bestScore, canvas.width - 10, 30);

  // 타이머 (좌측 상단)
  ctx.textAlign = "left";
  ctx.fillText("Time: " + survivalTime + "s", 10, 30);

  // 장애물 처리
  ctx.fillStyle = "red";
  obstacles.forEach((obs, index) => {
    obs.y += obs.speed;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    if (isColliding(player, obs)) {
      gameOver();
    }

    if (obs.y > canvas.height) {
      obstacles.splice(index, 1);
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

  startTime = Date.now(); // 시작 시간 저장
  survivalTime = 0;

  gameState = "playing";
}

function gameOver() {
  gameState = "gameover";

  // 최고 점수 갱신
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }

  // 진동 효과 (설정 ON일 때만)
  if (navigator.vibrate && vibrationEnabled) {
    navigator.vibrate([100, 50, 200]);
  }
}

function drawStartScreen() {
  // 배경 덮어쓰기
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "white";
ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("AVOID GAME", canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = "18px Arial";
  ctx.fillText("왼쪽 / 오른쪽 터치 이동", canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillText("화면을 터치하면 시작", canvas.width / 2, canvas.height / +30);
}

function drawGameOverScreen() {
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#E74C3C";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 70);

  ctx.font = "20px Arial";
  ctx.fillText("점수: " + score, canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillText(
    "생존 시간: " + survivalTime + "초",
    canvas.width / 2,
    canvas.height / 2 + 10,
  );
  ctx.fillText(
    "최고 점수: " + bestScore,
    canvas.width / 2,
    canvas.height / 2 + 35,
  );
  ctx.fillText(
    "클릭/터치해서 다시 시작",
    canvas.width / 2,
    canvas.height / 2 + 65,
  );
  // 버튼 배경
  // 버튼 배경 (작게)
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(
    resetButton.x,
    resetButton.y,
    resetButton.width,
    resetButton.height,
  );

  // 버튼 글씨
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  ctx.fillText("기록 초기화", resetButton.x + 8, resetButton.y + 17);

  // 진동 버튼 배경
ctx.fillStyle = "rgba(0,0,0,0.6)";
ctx.fillRect(
  vibrationButton.x,
  vibrationButton.y,
  vibrationButton.width,
  vibrationButton.height
);

// 버튼 텍스트
ctx.fillStyle = "white";
ctx.font = "12px Arial";
ctx.textAlign = "left";

let vibrationText = vibrationEnabled ? "진동: ON" : "진동: OFF";
ctx.fillText(vibrationText, vibrationButton.x + 8, vibrationButton.y + 17);

ctx.fillText(
  vibrationText,
  vibrationButton.x + 8,
  vibrationButton.y + 17
);
}
