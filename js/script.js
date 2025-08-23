// ハンバーガーメニュー
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.querySelector(".header__toggle");
  const navWrapper = document.querySelector(".header__nav-wrapper");

  toggleBtn.addEventListener("click", function () {
    toggleBtn.classList.toggle("is-active"); // ← ボタンにクラス追加
    navWrapper.classList.toggle("is-active");
  });
});

// トップページのヘッダー背景の制御
(() => {
  const header = document.querySelector(".header--top");
  if (!header) return;

  const THRESHOLD = 300; // 300pxで切替
  const img = header.querySelector(".header__logo img");
  const SRC_WHITE = img?.dataset.srcWhite || "";
  const SRC_COLOR = img?.dataset.srcColor || "";

  // 任意: 切替先を事前プリロード（チラつき防止）
  [SRC_WHITE, SRC_COLOR].forEach((src) => {
    if (!src) return;
    const pre = new Image();
    pre.src = src;
  });

  const setLogo = (solid) => {
    if (!img) return;
    const nextSrc = solid ? SRC_COLOR : SRC_WHITE;
    if (!nextSrc) return;
    // 同じURLなら何もしない（無駄な再設定を回避）
    if (img.getAttribute("src") !== nextSrc) {
      img.setAttribute("src", nextSrc);
    }
  };

  const apply = () => {
    const solid = window.scrollY >= THRESHOLD;
    header.classList.toggle("is-solid", solid);
    setLogo(solid);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };

  // ヘッダーhover時のロゴ切り替え
  header.addEventListener("mouseenter", () => {
    setLogo(true); // カラーロゴに切り替え
  });

  header.addEventListener("mouseleave", () => {
    // スクロール位置に応じて元の状態に戻す
    const solid = window.scrollY >= THRESHOLD;
    setLogo(solid);
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
})();

// 事業内容 アコーディオンのアニメーション
(() => {
  const panels = Array.from(document.querySelectorAll(".panel"));
  if (!panels.length) return;

  const LINE_DOWN = 700; // 下方向にスクロールしている時のライン
  const LINE_UP = 200; // 上方向にスクロールしている時のライン

  // 開閉
  const openOnly = (target) => {
    panels.forEach((panel) => {
      const content = panel.querySelector(".panel__content");
      if (!content) return;
      if (panel === target) {
        panel.classList.add("panel-active");
        content.style.maxHeight = content.scrollHeight + "px";
      } else {
        panel.classList.remove("panel-active");
        // auto→0 一度現在の高さ(px)を確定してから0へ
        if (getComputedStyle(content).maxHeight === "none") {
          content.style.maxHeight = content.scrollHeight + "px";
        }
        // 次フレームで 0 に落とすとトランジションが確実に走る
        requestAnimationFrame(() => {
          content.style.maxHeight = 0;
        });
      }
    });
  };

  // 初期状態：一番上を開く
  openOnly(panels[0]);
  let current = panels[0];

  // 前回のスクロール位置と方向を保持
  let lastY = window.scrollY;
  let lastDirDown = true; // 直近方向（resizeなど差分0のときに参照）
  let ticking = false;

  const pickCardOnLine = (line) => {
    // ラインが「カードの矩形内」にあるものを選ぶ（上端<=line<下端）
    return (
      panels.find((panel) => {
        const r = panel.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      }) || current
    );
  };

  const onScrollResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;

      // スクロール方向を判定
      let dirDown;
      if (y === lastY) {
        // resize など差分なしの場合は直近の方向を流用
        dirDown = lastDirDown;
      } else {
        dirDown = y > lastY;
        lastDirDown = dirDown;
      }

      const line = dirDown ? LINE_DOWN : LINE_UP;

      const target = pickCardOnLine(line);
      if (target !== current) {
        current = target;
        openOnly(current);
      } else {
        // 開き途中に中身の高さが変わる（画像読み込み等）対策
        const c = current.querySelector(".panel__content");
        if (c) c.style.maxHeight = c.scrollHeight + "px";
      }

      lastY = y;
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScrollResize, { passive: true });
  window.addEventListener("resize", onScrollResize, { passive: true });
  window.addEventListener("load", () => {
    // 画像などで高さが増えたら追随
    const c = current.querySelector(".panel__content");
    if (c) c.style.maxHeight = c.scrollHeight + "px";
    onScrollResize();
  });
})();

// main-kv--------------------------------------

// 要素取得
const mainArea = document.getElementById("main-area");
const mainWrap = document.getElementById("main-wrap");
const slides = document.querySelectorAll(".hero");
const dots = document.querySelectorAll(".kv-indicator__dot");

let currentIndex = 0;
let sum = 0;
let isAnimating = false;
let lastWheelTime = 0;

const MOVE_THRESHOLD = 20;
const GESTURE_GAP = 10;
const MAX = slides.length - 1;

// ----------------------------------
// IntersectionObserver: 100%見えたらロック、外れたら解除
// ----------------------------------
const observer = new IntersectionObserver(onIntersect, {
  root: null,
  threshold: 1,
});
observer.observe(mainArea);

function onIntersect(entries) {
  if (!entries[0]) return;

  if (entries[0].isIntersecting) {
    // 見えているスライド位置を transform から復元して同期
    syncIndexFromTransform();
    // 状態初期化
    sum = 0;
    isAnimating = false;
    lastWheelTime = 0;

    // 外スクロール禁止 + 入力監視開始
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", onWheel, { passive: false });
  } else {
    // 外スクロール許可 + 入力監視停止
    document.body.style.overflow = "auto";
    window.removeEventListener("wheel", onWheel);
  }
}

// ----------------------------------
// ホイール入力（1ジェスチャー=必ず1枚）
// ----------------------------------
function onWheel(e) {
  e.preventDefault();
  if (isAnimating) return;

  const now = e.timeStamp || performance.now();

  // ジェスチャーが切れたら累積をゼロに
  if (now - lastWheelTime > GESTURE_GAP) {
    sum = 0;
  }
  lastWheelTime = now;

  // 累積（サチュレートして多段進行を防ぐ）
  sum += e.deltaY;
  if (sum > MOVE_THRESHOLD) sum = MOVE_THRESHOLD;
  if (sum < -MOVE_THRESHOLD) sum = -MOVE_THRESHOLD;

  // 下方向（+）
  if (sum === MOVE_THRESHOLD) {
    if (currentIndex < MAX) {
      currentIndex++;
      moveSlide();
    } else {
      // 最終スライドでさらに下 → ロック解除して外へ
      unlockFromSection();
    }
    sum = 0; // 都度リセット
    return;
  }

  // 上方向（-）
  if (sum === -MOVE_THRESHOLD) {
    if (currentIndex > 0) {
      currentIndex--;
      moveSlide();
    }
    // 先頭でさらに上は今回は解除しない
    sum = 0;
  }
}

// ----------------------------------
// スライド移動（100vh単位）
// ----------------------------------
function moveSlide() {
  isAnimating = true; // アニメ中ガード
  sum = 0; // 念のためリセット

  // アニメ設定と移動
  mainWrap.style.transition = "transform 0.6s ease";
  mainWrap.style.transform = `translateY(${-100 * currentIndex}vh)`;

  // インジケーターも同期
  updateIndicator(currentIndex);
  animateTitle(currentIndex);
}

// アニメ完了で入力再開
mainWrap.addEventListener("transitionend", () => {
  isAnimating = false;
  sum = 0;
});

// ----------------------------------
// 解除（外へスクロール可能に戻す）
// ----------------------------------
function unlockFromSection() {
  isAnimating = false;
  sum = 0;
  document.body.style.overflow = "auto";
  window.removeEventListener("wheel", onWheel);

  // 少しだけ押し出してIOが「領域外」を認識しやすく（任意）
  requestAnimationFrame(() => window.scrollBy(0, 1));
}

// ----------------------------------
// transform から currentIndex を復元（再入場時）
// ----------------------------------
function syncIndexFromTransform() {
  const tf = getComputedStyle(mainWrap).transform;
  if (tf === "none") {
    currentIndex = 0;
    updateIndicator(currentIndex);
    animateTitle(currentIndex);
    return;
  }
  const m = new DOMMatrixReadOnly(tf);
  const ty = m.m42; // translateY(px)
  const vh = window.innerHeight; // 100vh の px 値
  currentIndex = Math.max(0, Math.min(MAX, Math.round(-ty / vh)));
  updateIndicator(currentIndex);
  animateTitle(currentIndex);
}

// ----------------------------------
// インジケーター（クリックで移動 + 表示同期）
// ----------------------------------
function updateIndicator(i) {
  dots.forEach((dot, idx) => {
    dot.classList.toggle("is-active", idx === i);
  });
}

dots.forEach((dot) => {
  dot.addEventListener("click", (e) => {
    e.preventDefault();
    if (isAnimating) return;

    const i = Number(dot.dataset.index);
    if (!Number.isFinite(i) || i === currentIndex) return;

    currentIndex = Math.max(0, Math.min(MAX, i));
    moveSlide();
  });
});

// ----------------------------------
// 初期表示：インジケーターだけ同期しておく（任意）
// ----------------------------------
requestAnimationFrame(() => {
  updateIndicator(currentIndex);
});

// ------------------------------
// h1 フェードイン用の関数
// ------------------------------
function animateTitle(index) {
  // すべての h1 から fade-in を外す（リセット）
  slides.forEach((slide) => {
    const title = slide.querySelector(".hero__title");
    if (title) title.classList.remove("fade-in");
  });

  // 対象スライドの h1 に fade-in を付与
  const currentSlide = slides[index];
  const title = currentSlide.querySelector(".hero__title");
  if (title) {
    // 一度リフローさせてから付け直すと確実に発火する
    void title.offsetWidth;
    title.classList.add("fade-in");
  }
}

// ページロード時に最初のタイトルをアニメーション
window.addEventListener("load", () => {
  animateTitle(currentIndex);
});
