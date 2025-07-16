const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");

// カメラ起動（解像度を指定）
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: false
})
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert("カメラへのアクセスが拒否されました");
    console.error(err);
  });

// タッチ操作で移動＆ピンチズーム
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
}, false);

character.addEventListener("touchmove", e => {
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
}, { passive: false });

// 写真撮影
document.getElementById("capture").addEventListener("click", () => {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  const ctx = canvas.getContext("2d");

  // video要素の画面上でのサイズ（CSSサイズ）
  const videoRect = video.getBoundingClientRect();

  // videoの実解像度と表示サイズの比率
  const scaleX = videoWidth / videoRect.width;
  const scaleY = videoHeight / videoRect.height;

  // 動画をキャンバスにフル描画
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

  // キャラクターの画面上の位置・サイズ
  const charRect = character.getBoundingClientRect();

  // キャンバス上でのキャラの位置・サイズに換算
  const charX = (charRect.left - videoRect.left) * scaleX;
  const charY = (charRect.top - videoRect.top) * scaleY;
  const charWidth = charRect.width * scaleX;
  const charHeight = charRect.height * scaleY;

  const img = new Image();
  img.src = character.src;
  img.onload = () => {
    ctx.drawImage(img, charX, charY, charWidth, charHeight);

    // 保存処理
    const link = document.createElement("a");
    link.download = "photo.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
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
