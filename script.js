const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");

const STANDARD_WIDTH = 3024;
const STANDARD_HEIGHT = 4032;

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
  // CanvasはiPhone標準サイズ固定
  canvas.width = STANDARD_WIDTH;
  canvas.height = STANDARD_HEIGHT;

  const ctx = canvas.getContext("2d");

  // videoの画面上の表示サイズを取得（CSSサイズ）
  const videoRect = video.getBoundingClientRect();

  // videoの実解像度はvideo.videoWidth/Height（取得できない場合もあり）
  // ここではcanvas固定サイズに引き伸ばすため、スケールはcanvasサイズ / videoRectサイズで計算
  const scaleX = STANDARD_WIDTH / videoRect.width;
  const scaleY = STANDARD_HEIGHT / videoRect.height;

  // video映像をcanvas全体に引き伸ばし描画
  ctx.drawImage(video, 0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);

  // キャラクターの画面上での位置とサイズ
  const charRect = character.getBoundingClientRect();

  // キャラクターの座標・サイズをcanvasのスケールに合わせて計算
  const charX = (charRect.left - videoRect.left) * scaleX;
  const charY = (charRect.top - videoRect.top) * scaleY;
  const charWidth = charRect.width * scaleX;
  const charHeight = charRect.height * scaleY;

  const img = new Image();
  img.src = character.src;
  img.onload = () => {
    ctx.drawImage(img, charX, charY, charWidth, charHeight);

    // ラベル画像もcanvasに描画
    const labelRect = label.getBoundingClientRect();
    const labelX = (labelRect.left - videoRect.left) * scaleX;
    const labelY = (labelRect.top - videoRect.top) * scaleY;
    const labelW = labelRect.width * scaleX;
    const labelH = labelRect.height * scaleY;

    const labelImg = new Image();
    labelImg.src = label.src;
    labelImg.onload = () => {
      ctx.drawImage(labelImg, labelX, labelY, labelW, labelH);

      // ダウンロード
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

// 初期画像を設定
character.src = characterImages[currentIndex];

// タップで画像を切り替え（タッチ操作と競合しないよう工夫）
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
