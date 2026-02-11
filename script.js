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
  const DEFAULT_COLOR = img?.getAttribute("src") || "";
  const DEFAULT_WHITE = "images/r2026/logo/logo-white02.png";
  const SRC_WHITE = img?.dataset.srcWhite || DEFAULT_WHITE;
  const SRC_COLOR = img?.dataset.srcColor || DEFAULT_COLOR;

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

// ============= main-kv（トップ専用） =============
(function () {
  // 要素取得
  const mainArea = document.getElementById("main-area");
  const mainWrap = document.getElementById("main-wrap");
  const slides = document.querySelectorAll(".hero");
  const dots = document.querySelectorAll(".kv-indicator__dot");

  // ▼ トップ以外や、要素が揃っていないページでは一切動かさない
  if (!mainArea || !mainWrap || slides.length === 0 || dots.length === 0) {
    return;
  }

  // スライド数に応じてmain-wrapの高さを動的設定
  mainWrap.style.height = `${slides.length * 100}vh`;

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
      sum = 0;
      return;
    }

    // 上方向（-）
    if (sum === -MOVE_THRESHOLD) {
      if (currentIndex > 0) {
        currentIndex--;
        moveSlide();
      }
      sum = 0;
    }
  }

  // ----------------------------------
  // スライド移動（100vh単位＋白ワイプ）
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

    if (slides[fromIndex]) {
      slides[fromIndex].classList.add("is-leaving");
    }
    if (slides[toIndex]) {
      slides[toIndex].classList.add("is-activating");
    }

    // 縦移動（強めの ease-out）
    mainWrap.style.transition = "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
    mainWrap.style.transform = `translateY(${-100 * toIndex}vh)`;

    updateIndicator(toIndex);
    animateTitle(toIndex);

    const OVERLAY_DURATION = 700; // heroWipeEnter / heroWipeLeave と揃える
    setTimeout(() => {
      slides.forEach((slide, i) => {
        slide.classList.toggle("is-active", i === toIndex);
      });

      if (slides[toIndex]) {
        slides[toIndex].classList.remove("is-activating");
      }
      if (slides[fromIndex]) {
        slides[fromIndex].classList.remove("is-leaving");
      }

      prevIndex = toIndex;
    }, OVERLAY_DURATION);
  }

  // アニメ完了で入力再開
  mainWrap.addEventListener("transitionend", (e) => {
    if (e.target !== mainWrap || e.propertyName !== "transform") return;

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
    const ty = m.m42;
    const vh = window.innerHeight;
    currentIndex = Math.max(0, Math.min(MAX, Math.round(-ty / vh)));
    updateIndicator(currentIndex);
    animateTitle(currentIndex);
  }

  // ----------------------------------
  // インジケーター
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

  // ------------------------------
  // h1 フェードイン用の関数（安全ガード付き）
  // ------------------------------
  function animateTitle(index) {
    if (!slides.length) return;

    slides.forEach((slide) => {
      const title = slide.querySelector(".hero__title");
      if (title) title.classList.remove("fade-in");
    });

    const currentSlide = slides[index];
    if (!currentSlide) return;
    const title = currentSlide.querySelector(".hero__title");
    if (!title) return;

    void title.offsetWidth;
    title.classList.add("fade-in");
  }

  const topTitle = document.querySelector(".hero--top .hero__title");
  let didInitialTopTitle = false;

  function triggerInitialTopTitle() {
    if (didInitialTopTitle || !topTitle) return;
    didInitialTopTitle = true;

    topTitle.classList.add("is-initial");
    topTitle.addEventListener(
      "animationend",
      (e) => {
        if (e.animationName !== "heroTitleInitial") return;
        topTitle.classList.remove("is-initial");
      },
      { once: true }
    );
  }

  function watchLoadingEnd() {
    if (!document.body.classList.contains("is-loading")) {
      triggerInitialTopTitle();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.body.classList.contains("is-loading")) {
        observer.disconnect();
        triggerInitialTopTitle();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  // 初期表示
  window.addEventListener("load", () => {
    watchLoadingEnd();
    animateTitle(currentIndex);
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === currentIndex);
    });
  });

  // 初期インジケーター
  requestAnimationFrame(() => {
    updateIndicator(currentIndex);
  });
})();

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
  let isHideTimerStarted = false; // 二重実行防止

  function hideLoader() {
    // どちらも完了していなければ何もしない
    if (!isPageLoaded || !isAnimationDone || isHideTimerStarted) return;

    isHideTimerStarted = true;

    // ★ ロゴアニメが終わってから待つ時間（ms）
    const DELAY = 1500;

    setTimeout(function () {
      body.classList.remove("is-loading");

      if (loader) {
        loader.classList.add("is-hidden");
      }
    }, DELAY);
  }

  // ページの読み込みが完了したらフラグを立てる
  window.addEventListener("load", function () {
    isPageLoaded = true;
    hideLoader();
  });

  // ロゴのフェードインアニメーションが終わったらフラグを立てる
  if (logo) {
    logo.addEventListener("animationend", function (e) {
      if (e.animationName === "logoFadeIn") {
        isAnimationDone = true;
        hideLoader();
      }
    });
  }
})();

// ============== サービスステーションページ: アンカー遷移 ===============
document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll(
    ".station-search__area-button[href^='#']"
  );
  if (!links.length) return;

  const header = document.querySelector(".header");

  const getOffset = () => {
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue("--header-height")
      .trim();
    const headerHeight = parseFloat(cssValue);
    const fallback = header ? header.offsetHeight : 96;
    return (Number.isNaN(headerHeight) ? fallback : headerHeight) + 12;
  };

  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const top =
        target.getBoundingClientRect().top + window.scrollY - getOffset();

      window.scrollTo({
        top,
        behavior: "smooth",
      });

      history.replaceState(null, "", targetId);
    });
  });
});
