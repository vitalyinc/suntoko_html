// ================== ハンバーガーメニュー ===================
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.querySelector(".header__toggle");
  const navWrapper = document.querySelector(".header__nav-wrapper");
  const header = document.querySelector(".header");
  const root = document.documentElement;

  const setHeaderHeight = () => {
    if (!header) return;
    root.style.setProperty("--header-height", `${header.offsetHeight}px`);
  };

  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);

  // 初期表示時にトランジションが走らないよう、準備完了後に付与
  navWrapper.classList.add("is-ready");

  const closeMenu = () => {
    toggleBtn.classList.remove("is-active");
    navWrapper.classList.remove("is-active");
    navWrapper.classList.add("is-leaving");
  };

  const openMenu = () => {
    navWrapper.classList.remove("is-leaving");
    navWrapper.classList.add("is-active");
    toggleBtn.classList.add("is-active");
  };

  toggleBtn.addEventListener("click", function () {
    const isOpen = navWrapper.classList.contains("is-active");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navWrapper.addEventListener("transitionend", (e) => {
    if (e.target !== navWrapper) return;
    if (!navWrapper.classList.contains("is-active")) {
      navWrapper.classList.remove("is-leaving");
    }
  });
});

// ============== トップページのヘッダー背景の制御 ===============
(() => {
  const header = document.querySelector(".header--top");
  if (!header) return;

  const THRESHOLD = 300; // 300pxで切替
  const img = header.querySelector(".header__logo img");
  const SRC_WHITE = img?.dataset.srcWhite || "";
  const SRC_COLOR = img?.dataset.srcColor || "";

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

// ================メインビジュアルのスライダー================

// main-kv--------------------------------------

// 要素取得
const mainArea = document.getElementById("main-area");
const mainWrap = document.getElementById("main-wrap");
const slides = document.querySelectorAll(".hero");
const dots = document.querySelectorAll(".kv-indicator__dot");

// スライド数に応じてmain-wrapの高さを動的設定
if (mainWrap && slides.length > 0) {
  mainWrap.style.height = `${slides.length * 100}vh`;
}

let currentIndex = 0;
let sum = 0;
let isAnimating = false;
let lastWheelTime = 0;
let prevIndex = 0; // 直前のスライドを覚えておく

const MOVE_THRESHOLD = 12;
const GESTURE_GAP = 1;
const MAX = slides.length - 1; // スライド数に応じて動的設定

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
  if (isAnimating) return;
  isAnimating = true;
  sum = 0;

  const fromIndex = prevIndex; // さっきまで表示していたスライド
  const toIndex = currentIndex; // これから表示するスライド

  // まずは全スライドから「ワイプ用クラス」を外しておく
  slides.forEach((slide) => {
    slide.classList.remove("is-activating", "is-leaving");
  });

  // 退場するスライドに白ワイプ（右から入ってきて全面を白で覆う）
  if (slides[fromIndex]) {
    slides[fromIndex].classList.add("is-leaving");
  }

  // 入場するスライドにも白ワイプ（いったん白で覆ったあと右へ抜けていく）
  if (slides[toIndex]) {
    slides[toIndex].classList.add("is-activating");
  }

  // === スライドの縦移動（ease-out を強めに変更）===
  // 0.8s はお好みで 0.7〜1.0 に調整してOK
  mainWrap.style.transition = "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
  mainWrap.style.transform = `translateY(${-100 * toIndex}vh)`;

  // インジケーター & タイトルアニメも同期
  updateIndicator(toIndex);
  animateTitle(toIndex);

  // 白ワイプのCSSアニメ（0.7s）終了後にクラス整理 & is-active付与
  const OVERLAY_DURATION = 700; // heroWipeEnter / heroWipeLeave と揃える
  setTimeout(() => {
    // 次のスライドを「現在アクティブ」として扱う
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === toIndex);
    });

    // ワイプ用クラスをリセット
    if (slides[toIndex]) {
      slides[toIndex].classList.remove("is-activating");
    }
    if (slides[fromIndex]) {
      slides[fromIndex].classList.remove("is-leaving");
    }

    prevIndex = toIndex; // 次回の「fromIndex」になる
  }, OVERLAY_DURATION);
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

  // 追加：初期スライドを is-active にしておく
  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === currentIndex);
  });
});

// ============== サンプル①red サントーコーの強み ===============
document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".feature-item");

  // IntersectionObserver が使えない古いブラウザの場合は、
  // とりあえずアニメなしで全部表示させる
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (item) {
      item.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          // 一度表示したら監視を解除（何回も発火させない）
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.3, // 要素が 30% くらい見えたら発火
    }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
});
// ============== サンプル①red 取扱商品フェードイン ===============
document.addEventListener("DOMContentLoaded", function () {
  const leads = document.querySelectorAll(
    ".page-block--service .page-block__lead"
  );

  if (!("IntersectionObserver" in window)) {
    leads.forEach(function (lead) {
      lead.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.3,
    }
  );

  leads.forEach(function (lead) {
    observer.observe(lead);
  });
});

// ============== サンプル②blue  ===============

// サントーコーの強み
document.addEventListener("DOMContentLoaded", function () {
  const strengthsList = document.querySelector(".strengths-list");
  if (!strengthsList) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          strengthsList.classList.add("is-active");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      threshold: 0.3,
    }
  );

  observer.observe(strengthsList);
});

// ローディングアニメーション
(function () {
  const loader = document.getElementById("loading");
  const body = document.body;
  const logo = document.querySelector(".loading__logo"); // ロゴがフェードインする要素

  let isPageLoaded = false; // ページ読み込み完了したか
  let isAnimationDone = false; // ローディングアニメが終わったか

  function hideLoader() {
    // どちらも完了していなければ何もしない
    if (!isPageLoaded || !isAnimationDone) return;

    // ここまで来たらローディングを消す
    body.classList.remove("is-loading");

    if (loader) {
      loader.classList.add("is-hidden");
    }
  }

  // ページの読み込みが完了したらフラグを立てる
  window.addEventListener("load", function () {
    isPageLoaded = true;
    hideLoader();
  });

  // ロゴのフェードインアニメーションが終わったらフラグを立てる
  if (logo) {
    logo.addEventListener("animationend", function (e) {
      // 念のため、どのアニメーションかチェック
      if (e.animationName === "logoFadeIn") {
        isAnimationDone = true;
        hideLoader();
      }
    });
  }
})();
