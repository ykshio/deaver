// 要素取得
const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");
const menuBar = document.getElementById("menuBar");

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;
let useFrontCamera = false;

// シェアメニュー切替
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

// カメラ起動
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
    showModal("カメラの起動に失敗しました。ブラウザの設定を確認してください。");
    console.error(err);
  }
}
startCamera();

// キャラクター画像設定
const characterImages = [
  "images/deaver_default.png",
  "images/deaver_front.png",
  "images/deaver_left.png",
  "images/deaver_right.png",
];
let currentIndex = 0;
character.src = characterImages[currentIndex];

// タップで切り替え
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

// キャラクター移動 & 拡大縮小
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

// ラベル位置切替
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

// 撮影処理
document.getElementById("capture").addEventListener("click", async () => {
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
        document.getElementById("previewImage").src = url;
        toggleShareMenu(true);

        document.getElementById("saveBtn").onclick = () => {
          const a = document.createElement("a");
          a.href = url;
          a.download = "photo.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };

        document.getElementById("copyBtn").onclick = async () => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            alert("クリップボードにコピーしました！");
          } catch (e) {
            alert("コピーに失敗しました");
          }
        };

        document.getElementById("tweetBtn").onclick = async () => {
          const text =
            "ディーバーくんと撮影したよ📸\n#ディーバーくん #TDU #東京電機大学";
          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text
          )}`;

          // X投稿用の空ウィンドウ（ポップアップブロック対策）
          const tweetWindow = window.open("", "_blank");

          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);

            showTweetModal(tweetWindow, tweetUrl);
          } catch (e) {
            alert("コピーに失敗しました。保存してから投稿してください。");
            if (tweetWindow) tweetWindow.close();
            console.error(e);
          }
        };

        document.getElementById("instagramBtn").onclick = () => {
          alert(
            "Instagramへの直接投稿はできません。写真を保存してInstagramアプリから投稿してください。"
          );
        };

        document.getElementById("backToCameraBtn").onclick = () => {
          toggleShareMenu(false);
          startCamera();
        };
      }, "image/png");
    };
  };
});

// カメラ切り替え
document.getElementById("switchCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

// モーダル制御（使い方表示）
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

// 投稿ボタン（トップ画面用）
document.getElementById("tweet")?.addEventListener("click", () => {
  const text =
    "ディーバーくんと撮影したよ📸\n#ディーバーくん #TDU #東京電機大学";
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}`;
  window.open(url, "_blank");
});

// モーダル表示
function showModal(message) {
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="custom-modal-content">
      <p>${message}</p>
      <button class="close-modal">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".close-modal").addEventListener("click", () => {
    document.body.removeChild(modal);
  });
}

// Service Worker 登録
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((reg) => console.log("SW registered", reg))
    .catch((err) => console.warn("SW registration failed", err));
}

function showTweetModal(tweetWindow, tweetUrl) {
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="custom-modal-content">
      <p>コピーしました。<br>『投稿』を押すとXの投稿画面に遷移します。<br>画像は貼り付け（ペースト）してください。</p>
      <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
        <button class="tweet-cancel">キャンセル</button>
        <button class="tweet-post">投稿</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".tweet-cancel").addEventListener("click", () => {
    document.body.removeChild(modal);
    if (tweetWindow) tweetWindow.close();
  });

  modal.querySelector(".tweet-post").addEventListener("click", () => {
    if (tweetWindow) {
      tweetWindow.location.href = tweetUrl;
    }
    document.body.removeChild(modal);
  });
}
