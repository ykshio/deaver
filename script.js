const video = document.getElementById("camera");
const character = document.getElementById("character");
const canvas = document.getElementById("canvas");
const label = document.getElementById("characterLabel");

const STANDARD_WIDTH = 1080;
const STANDARD_HEIGHT = 1920;

let useFrontCamera = false;

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
            video.srcObject.getTracks().forEach(track => track.stop());
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
character.addEventListener("touchstart", () => { touchMoved = false; });
character.addEventListener("touchmove", () => { touchMoved = true; });
character.addEventListener("touchend", () => {
    if (!touchMoved) {
        currentIndex = (currentIndex + 1) % characterImages.length;
        character.src = characterImages[currentIndex];
    }
});

// キャラ移動＆ピンチズーム
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

// ラベル位置切り替え
const labelPositions = ["label-top-left", "label-top-right", "label-bottom-right", "label-bottom-left"];
let labelIndex = 3;
label.classList.add(labelPositions[labelIndex]);
label.addEventListener("click", () => {
    label.classList.replace(labelPositions[labelIndex], labelPositions[labelIndex = (labelIndex + 1) % 4]);
});

// 撮影・画像合成・保存・再起動
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
        li.onload = () => {
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
                        console.log("クリップボードにコピーしました");
                    } catch (e) {
                        console.warn("クリップボードコピーに失敗", e);
                    }
                }

                await startCamera(); // 再起動
            }, "image/png");
        };
    };
});

// カメラ切替
document.getElementById("switchCamera").addEventListener("click", async () => {
    useFrontCamera = !useFrontCamera;
    await startCamera();
});

// Tweet投稿（HTMLでも設定済みだが冗長性を持たせて保持）
document.getElementById("tweet").addEventListener("click", () => {
    const text = "ディーバーくんと撮影したよ📸\n#ディーバーくん #TDU #東京電機大学";
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
});

// Service Worker登録（PWA対応）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log("SW registered", reg))
        .catch(console.error);
}
