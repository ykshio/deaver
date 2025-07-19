const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");
const menuBar = document.getElementById("menuBar"); // メニューバー要素

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;

let useFrontCamera = false;

// 共有メニュー表示・非表示と連動してラベル・メニューバー表示制御
function toggleShareMenu(show) {
  const shareMenu = document.getElementById("shareMenu");
  if (show) {
    shareMenu.classList.add("active");
    label.style.display = "none";
    menuBar.style.display = "none";
  } else {
    shareMenu.classList.remove("active");
    label.style.display = "";
    menuBar.style.display = "";
  }
}

// カメラ起動・再起動用関数
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: useFrontCamera ? "user" : "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: 16 / 9,
      },
      audio: false,
    });

    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }

    video.srcObject = stream;
    await video.play();
  } catch (err) {
    alert("カメラの起動に失敗しました。ブラウザの設定を確認してください。");
    console.error(err);
  }
}
startCamera();

// キャラ画像変更（タップ）
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

// キャラ移動＆ピンチズーム
let scale = 1,
  lastScale = 1;
let posX = window.innerWidth / 2,
  posY = window.innerHeight / 2;
let startX = 0,
  startY = 0;

character.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  } else if (e.touches.length === 2) {
    lastScale = scale;
  }
});

character.addEventListener(
  "touchmove",
  (e) => {
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
  },
  { passive: false }
);

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
  label.classList.replace(
    labelPositions[labelIndex],
    labelPositions[(labelIndex = (labelIndex + 1) % 4)]
  );
});

// 撮影・画像合成・保存・共有メニュー表示
document.getElementById("capture").addEventListener("click", async () => {
  // シャッター音再生
  const shutterSound = document.getElementById("shutterSound");
  if (shutterSound) {
    shutterSound.currentTime = 0;
    shutterSound.play().catch((err) => console.warn("音声再生に失敗:", err));
  }

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
    li.onload = () => {
      ctx.drawImage(li, lx, ly, lw, lh);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);

        // プレビュー表示＆共有メニュー開く
        const previewImg = document.getElementById("previewImage");
        previewImg.src = url;
        toggleShareMenu(true);

        // 保存ボタン
        document.getElementById("saveBtn").onclick = () => {
          const a = document.createElement("a");
          a.href = url;
          a.download = "photo.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };

        // コピー機能
        if (navigator.clipboard && window.ClipboardItem) {
          document.getElementById("copyBtn").onclick = async () => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              alert("クリップボードにコピーしました！");
            } catch (e) {
              alert("コピーに失敗しました");
              console.warn(e);
            }
          };
        } else {
          document.getElementById("copyBtn").disabled = true;
          document.getElementById("copyBtn").title =
            "このブラウザは対応していません";
        }

        // Xに投稿
        document.getElementById("tweetBtn").onclick = async () => {
          const text =
            "ディーバーくんと撮影したよ📸\n#ディーバーくん #TDU #東京電機大学";

          if (!navigator.clipboard || !window.ClipboardItem) {
            alert(
              "このブラウザは画像コピーに対応していません。写真を保存してから投稿してください。"
            );
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
              text
            )}`;
            window.open(tweetUrl, "_blank");
            return;
          }

          try {
            // 画像をコピー
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);

            // カスタムダイアログ風の confirm
            const proceed = confirm(
              "コピーしました。\n「投稿する」を押すとXの投稿画面に遷移します。\n画像はペーストしてください。"
            );

            if (proceed) {
              const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                text
              )}`;
              window.open(tweetUrl, "_blank");
            }
          } catch (e) {
            alert("コピーに失敗しました。写真を保存してから投稿してください。");
            console.warn(e);
          }
        };

        // Instagram案内
        document.getElementById("instagramBtn").onclick = () => {
          alert(
            "Instagramへの直接投稿はできません。写真を保存してからInstagramアプリで投稿してください。"
          );
        };

        // カメラに戻るボタン
        document.getElementById("backToCameraBtn").onclick = () => {
          toggleShareMenu(false);
          startCamera();
        };
      }, "image/png");
    };
  };
});

// カメラ切替
document.getElementById("switchCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

// 使い方モーダル制御
window.addEventListener("load", () => {
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeModal");
  const openBtn = document.getElementById("openModal");

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  openBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  // Xに投稿（メニューボタン）
  document.getElementById("tweet").addEventListener("click", () => {
    const text =
      "ディーバーくんと撮影したよ📸\n#ディーバーくん #TDU #東京電機大学";
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(url, "_blank");
  });

  // ローディング画面制御
  const loading = document.getElementById("loading");
  const MIN_LOADING_TIME = 1000;
  const start = performance.now();

  const elapsed = performance.now() - start;
  const delay = Math.max(0, MIN_LOADING_TIME - elapsed);

  setTimeout(() => {
    loading.classList.add("hide");
    setTimeout(() => (loading.style.display = "none"), 500);
  }, delay);
});

// Service Worker登録（PWA対応）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((reg) => console.log("SW registered", reg))
    .catch((err) => console.warn("SW registration failed", err));
}

function showNotification(message) {
  const modal = document.getElementById("notificationModal");
  const messageElem = document.getElementById("notificationMessage");
  const closeBtn = document.getElementById("notificationCloseBtn");

  messageElem.textContent = message;
  modal.classList.add("active");

  closeBtn.onclick = () => {
    modal.classList.remove("active");
  };
}
