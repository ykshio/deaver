const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;

// カメラ起動・取得
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: 16 / 9,
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    alert("カメラへのアクセスが拒否されました");
    console.error(err);
  }
}
startCamera();

// キャラクター操作（ドラッグ＆ピンチズーム）
let scale = 1, lastScale = 1;
let posX = window.innerWidth / 2, posY = window.innerHeight / 2;
let startX = 0, startY = 0;

character.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  } else if (e.touches.length === 2) {
    lastScale = scale;
  }
});

character.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    scale = lastScale * (Math.hypot(dx, dy) / 200);
  }
  character.style.left = `${posX}px`;
  character.style.top = `${posY}px`;
  character.style.transform = `translate(-50%, -50%) scale(${scale})`;
}, { passive: false });

// キャラ画像切替
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
    character.src = characterImages[++currentIndex % characterImages.length];
  }
});

// ラベル位置チェンジ
const labelPositions = ["label-top-left", "label-top-right", "label-bottom-right", "label-bottom-left"];
let labelIndex = 3;
label.classList.add(labelPositions[labelIndex]);
label.addEventListener("click", () => {
  label.classList.replace(labelPositions[labelIndex], labelPositions[labelIndex = (labelIndex + 1) % 4]);
});

// 撮影・保存・再起動
document.getElementById("capture").addEventListener("click", async () => {
  canvas.width = STANDARD_WIDTH;
  canvas.height = STANDARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  const vRatio = video.videoWidth / video.videoHeight;
  const cRatio = STANDARD_WIDTH / STANDARD_HEIGHT;
  let dw, dh, ox, oy;

  if (vRatio > cRatio) {
    dh = STANDARD_HEIGHT;
    dw = video.videoWidth * (dh / video.videoHeight);
    ox = (STANDARD_WIDTH - dw) / 2;
    oy = 0;
  } else {
    dw = STANDARD_WIDTH;
    dh = video.videoHeight * (dw / video.videoWidth);
    ox = 0;
    oy = (STANDARD_HEIGHT - dh) / 2;
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);
  ctx.drawImage(video, ox, oy, dw, dh);

  const vr = video.getBoundingClientRect();
  const scaleX = STANDARD_WIDTH / vr.width;
  const scaleY = STANDARD_HEIGHT / vr.height;

  const cr = character.getBoundingClientRect();
  const cx = (cr.left - vr.left) * scaleX;
  const cy = (cr.top - vr.top) * scaleY;
  const cw = cr.width * scaleX;
  const ch = cr.height * scaleY;

  const img = new Image();
  img.src = character.src;
  img.onload = () => {
    ctx.drawImage(img, cx, cy, cw, ch);

    const lr = label.getBoundingClientRect();
    const lx = (lr.left - vr.left) * scaleX;
    const ly = (lr.top - vr.top) * scaleY;
    const lw = lr.width * scaleX;
    const lh = lr.height * scaleY;

    const li = new Image();
    li.src = label.src;
    li.onload = async () => {
      ctx.drawImage(li, lx, ly, lw, lh);

      canvas.toBlob(async blob => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "photo.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (navigator.clipboard && ClipboardItem) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            console.log("Copied to clipboard");
          } catch (e) {
            console.warn("Clipboard error", e);
          }
        }

        await startCamera();  // カメラ再起動
      }, "image/png");
    };
  };
});

// PWA：ServiceWorker登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log("SW registered", reg))
    .catch(console.error);
}

// カメラ切替機能
let currentFacing = "environment";

async function startCamera(facingMode = "environment") {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: 16 / 9,
      },
      audio: false,
    });
    video.srcObject = stream;
    video.play();
    currentFacing = facingMode;
  } catch (err) {
    console.error("カメラ起動に失敗しました:", err);
    alert("カメラ切替に失敗しました");
  }
}

document.getElementById("toggleCamera").addEventListener("click", () => {
  const newFacing = currentFacing === "environment" ? "user" : "environment";
  startCamera(newFacing);
});

// 初期カメラ起動
startCamera();