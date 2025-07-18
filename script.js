const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;

// カメラ起動（できるだけ高解像度をリクエスト）
navigator.mediaDevices
  .getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: STANDARD_WIDTH },
      height: { ideal: STANDARD_HEIGHT },
    },
    audio: false,
  })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
  })
  .catch((err) => {
    alert("カメラへのアクセスが拒否されました");
    console.error(err);
  });

// タッチ操作で移動＆ピンチズーム
let scale = 1,
  lastScale = 1;
let posX = window.innerWidth / 2,
  posY = window.innerHeight / 2;
let startX = 0,
  startY = 0;

character.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    } else if (e.touches.length === 2) {
      lastScale = scale;
    }
  },
  false
);

character.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      posX = e.touches[0].clientX - startX;
      posY = e.touches[0].clientY - startY;
    } else if (e.touches.length === 2) {
      let dx = e.touches[0].clientX - e.touches[1].clientX;
      let dy = e.touches[0].clientY - e.touches[1].clientY;
      let dist = Math.sqrt(dx * dx + dy * dy);
      scale = lastScale * (dist / 200);
    }

    character.style.left = `${posX}px`;
    character.style.top = `${posY}px`;
    character.style.transform = `translate(-50%, -50%) scale(${scale})`;
  },
  { passive: false }
);

// 写真撮影
document.getElementById("capture").addEventListener("click", () => {
  canvas.width = STANDARD_WIDTH;
  canvas.height = STANDARD_HEIGHT;

  const ctx = canvas.getContext("2d");
  const videoRect = video.getBoundingClientRect();

  const scaleX = STANDARD_WIDTH / videoRect.width;
  const scaleY = STANDARD_HEIGHT / videoRect.height;

  ctx.drawImage(video, 0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);

  const charRect = character.getBoundingClientRect();
  const charX = (charRect.left - videoRect.left) * scaleX;
  const charY = (charRect.top - videoRect.top) * scaleY;
  const charWidth = charRect.width * scaleX;
  const charHeight = charRect.height * scaleY;

  const img = new Image();
  img.src = character.src;
  img.onload = () => {
    ctx.drawImage(img, charX, charY, charWidth, charHeight);

    const labelRect = label.getBoundingClientRect();
    const labelX = (labelRect.left - videoRect.left) * scaleX;
    const labelY = (labelRect.top - videoRect.top) * scaleY;
    const labelW = labelRect.width * scaleX;
    const labelH = labelRect.height * scaleY;

    const labelImg = new Image();
    labelImg.src = label.src;
    labelImg.onload = () => {
      ctx.drawImage(labelImg, labelX, labelY, labelW, labelH);

      const link = document.createElement("a");
      link.download = "photo.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };
});

// キャラクター画像を順番に切り替える
const characterImages = [
  "images/deaver_default.png",
  "images/deaver_front.png",
  "images/deaver_left.png",
  "images/deaver_right.png",
];
let currentIndex = 0;

character.src = characterImages[currentIndex];

let touchMoved = false;

character.addEventListener("touchstart", () => {
  touchMoved = false;
});

character.addEventListener("touchmove", () => {
  touchMoved = true;
});

character.addEventListener("touchend", () => {
  if (!touchMoved) {
    currentIndex = (currentIndex + 1) % characterImages.length;
    character.src = characterImages[currentIndex];
  }
});

// ラベル位置切り替え（四隅）
const labelPositions = [
  "label-top-left",
  "label-top-right",
  "label-bottom-right",
  "label-bottom-left",
];
let labelIndex = 3; // 初期: 左下

label.classList.add(labelPositions[labelIndex]);

label.addEventListener("click", () => {
  label.classList.remove(labelPositions[labelIndex]);
  labelIndex = (labelIndex + 1) % labelPositions.length;
  label.classList.add(labelPositions[labelIndex]);
});
