const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;

// カメラ起動
navigator.mediaDevices
  .getUserMedia({
    video: {
      facingMode: { exact: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: 16 / 9,
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

// キャラクターのタッチ操作
let scale = 1, lastScale = 1;
let posX = window.innerWidth / 2, posY = window.innerHeight / 2;
let startX = 0, startY = 0;

character.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  } else if (e.touches.length === 2) {
    lastScale = scale;
  }
}, false);

character.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    scale = lastScale * (dist / 200);
  }
  character.style.left = `${posX}px`;
  character.style.top = `${posY}px`;
  character.style.transform = `translate(-50%, -50%) scale(${scale})`;
}, { passive: false });

// キャラクター画像切り替え
const characterImages = [
  "images/deaver_default.png",
  "images/deaver_front.png",
  "images/deaver_left.png",
  "images/deaver_right.png",
];
let currentIndex = 0;
character.src = characterImages[currentIndex];

let touchMoved = false;
character.addEventListener("touchstart", () => { touchMoved = false; });
character.addEventListener("touchmove", () => { touchMoved = true; });
character.addEventListener("touchend", () => {
  if (!touchMoved) {
    currentIndex = (currentIndex + 1) % characterImages.length;
    character.src = characterImages[currentIndex];
  }
});

// ラベル位置切り替え
const labelPositions = [
  "label-top-left",
  "label-top-right",
  "label-bottom-right",
  "label-bottom-left",
];
let labelIndex = 3;
label.classList.add(labelPositions[labelIndex]);

label.addEventListener("click", () => {
  label.classList.remove(labelPositions[labelIndex]);
  labelIndex = (labelIndex + 1) % labelPositions.length;
  label.classList.add(labelPositions[labelIndex]);
});

// 撮影＆保存処理
document.getElementById("capture").addEventListener("click", async () => {
  canvas.width = STANDARD_WIDTH;
  canvas.height = STANDARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = STANDARD_WIDTH / STANDARD_HEIGHT;

  let drawWidth, drawHeight, offsetX, offsetY;

  if (videoAspect > canvasAspect) {
    drawHeight = STANDARD_HEIGHT;
    drawWidth = video.videoWidth * (STANDARD_HEIGHT / video.videoHeight);
    offsetX = (STANDARD_WIDTH - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = STANDARD_WIDTH;
    drawHeight = video.videoHeight * (STANDARD_WIDTH / video.videoWidth);
    offsetX = 0;
    offsetY = (STANDARD_HEIGHT - drawHeight) / 2;
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);
  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

  const videoRect = video.getBoundingClientRect();
  const scaleX = STANDARD_WIDTH / videoRect.width;
  const scaleY = STANDARD_HEIGHT / videoRect.height;

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
    labelImg.onload = async () => {
      ctx.drawImage(labelImg, labelX, labelY, labelW, labelH);

      // Blobで安全にダウンロード
      canvas.toBlob(async (blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = "photo.png";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(blobUrl);

          // クリップボード保存（あれば）
          if (navigator.clipboard && window.ClipboardItem) {
            try {
              const item = new ClipboardItem({ "image/png": blob });
              await navigator.clipboard.write([item]);
              console.log("画像をクリップボードに保存しました");
            } catch (err) {
              console.warn("クリップボード保存に失敗:", err);
            }
          }
        }
      }, "image/png");

      // PWAではカメラ再起動（保険）
      await restartCamera();
    };
  };
});


// PWA: Service Worker登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    console.log("SW registered:", reg);
  }).catch(err => {
    console.error("SW registration failed:", err);
  });
}
