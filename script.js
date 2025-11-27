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

(() => {
  const area = document.querySelector(".main-area");
  const wrap = document.querySelector(".main-area__wrap");
  const slides = Array.from(document.querySelectorAll(".hero"));
  const dots = Array.from(document.querySelectorAll(".kv-indicator__dot"));
  if (!area || !wrap || !slides.length) return;

  // ===== 設定 =====
  const SCROLL_PER_SLIDE_PX = 30; // 1枚切替の閾値
  const TRANSITION_MS = 200; // CSSのtransitionと合わせる
  const MIN_LOCK_MS = 260; // 最低ロック時間（アニメ完了＋少し余裕）
  const IDLE_WHEEL_MS = 260; // wheelが止まったとみなす時間
  const IDLE_TOUCH_MS = 200; // touchが止まったとみなす時間
  const SAFE_UNLOCK_MS = 1200; // 安全解除の上限（ここで必ず解除）
  const MIN_INDEX = 0;
  const MAX_INDEX = slides.length - 1;

  // ===== 状態 =====
  let index = 0;
  let acc = 0; // 1ジェスチャー内の累積
  let locked = false;
  let lockStartedAt = 0;
  let lockDevice = null; // 'wheel' | 'touch' | null
  let lastWheelAt = 0; // 直近のwheel活動時刻
  let lastTouchAt = 0; // 直近のtouch活動時刻
  let unlockTimer = null;
  let vh = window.innerHeight;

  // 初期表示
  const EASING = "cubic-bezier(0.23, 1, 0.32, 1)"; // 強めの減速（Materialのstandard decelerate）
  wrap.style.transition = `transform ${TRANSITION_MS}ms ${EASING}`;

  applyTransform();
  updateDots();
  updateActiveSlideFx();

  // ===== 基本関数 =====
  function applyTransform() {
    wrap.style.transform = `translate3d(0, ${-index * vh}px, 0)`;
  }
  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  }
  function updateActiveSlideFx() {
    slides.forEach((s, i) => {
      // スライド自体に is-active を付け外し
      s.classList.toggle("is-active", i === index);
    });
  }

  function go(next) {
    const clamped = Math.max(MIN_INDEX, Math.min(MAX_INDEX, next));
    if (clamped === index) return;
    index = clamped;
    applyTransform();
    updateDots();
    updateActiveSlideFx();
  }

  // ===== ロック制御 =====
  function lockAndWatch(device) {
    locked = true;
    lockDevice = device;
    lockStartedAt = Date.now();
    acc = 0;
    scheduleUnlockCheck();
  }
  function scheduleUnlockCheck() {
    if (unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = setTimeout(checkUnlock, 50);
  }
  function checkUnlock() {
    const now = Date.now();
    const minTimePassed = now - lockStartedAt >= MIN_LOCK_MS;
    const idleSince =
      lockDevice === "touch" ? now - lastTouchAt : now - lastWheelAt;
    const needIdle = lockDevice === "touch" ? IDLE_TOUCH_MS : IDLE_WHEEL_MS;
    const deviceIdle = idleSince >= needIdle;
    const safeTimeout = now - lockStartedAt >= SAFE_UNLOCK_MS;

    if ((minTimePassed && deviceIdle) || safeTimeout) {
      locked = false;
      lockDevice = null;
      acc = 0; // 解除時もクリア
      return;
    }
    scheduleUnlockCheck();
  }

  // ===== 端での蓄積吸収（コア改善点）=====
  // 先頭で上方向（負のdelta）、末尾で下方向（正のdelta）は毎回 acc を 0 に戻して吸収
  function absorbEdgeIfNeeded(delta) {
    // delta > 0: 下方向（次へ） / delta < 0: 上方向（前へ）
    if (index === MIN_INDEX && delta < 0) {
      acc = 0;
      return true; // ここで処理終わり（蓄積しない）
    }
    if (index === MAX_INDEX && delta > 0) {
      acc = 0;
      return true;
    }
    return false;
  }

  // ===== スライド =====
  // 追加: 入退場アニメの長さ（CSSと揃える）
  const ENTER_MS = 900;
  const LEAVE_MS = 900;

  // 追加: 入退場クラスを一時付与
  function markActivation(prevIdx, nextIdx) {
    const prevEl = slides[prevIdx];
    const nextEl = slides[nextIdx];

    if (prevEl) {
      prevEl.classList.add("is-leaving");
      setTimeout(() => prevEl.classList.remove("is-leaving"), LEAVE_MS + 30);
    }
    if (nextEl) {
      // 入場は「まず覆ってから→右へ抜ける」ので is-activating を付与
      nextEl.classList.add("is-activating");
      setTimeout(() => nextEl.classList.remove("is-activating"), ENTER_MS + 30);
    }
  }

  function slide(dir, device) {
    if (locked) return;
    const next = index + (dir > 0 ? 1 : -1);

    // 範囲外要求はここで吸収 + 累積クリア（セーフティ）
    if (next < MIN_INDEX || next > MAX_INDEX) {
      acc = 0; // ← これ大事
      return;
    }

    const prev = index;
    markActivation(prev, next); // 入退場アニメの発火
    go(next);
    lockAndWatch(device);
  }

  // ===== ホイール =====
  const onWheel = (e) => {
    e.preventDefault();
    lastWheelAt = Date.now();

    if (locked) return;

    const delta = e.deltaY;

    // 端での逆方向は吸収（accを0維持）
    if (absorbEdgeIfNeeded(delta)) return;

    acc += delta;

    if (acc >= SCROLL_PER_SLIDE_PX) {
      slide(+1, "wheel");
    } else if (acc <= -SCROLL_PER_SLIDE_PX) {
      slide(-1, "wheel");
    }
  };
  area.addEventListener("wheel", onWheel, { passive: false });

  // ===== タッチ =====
  let touchStartY = null;

  const onTouchStart = (e) => {
    if (!e.touches || !e.touches.length) return;
    touchStartY = e.touches[0].clientY;
    acc = 0;
    lastTouchAt = Date.now();
  };
  const onTouchMove = (e) => {
    if (touchStartY == null) return;
    e.preventDefault();
    lastTouchAt = Date.now();
    if (locked) return;

    const y = e.touches[0].clientY;
    const dy = touchStartY - y; // 下へスワイプで正、上へスワイプで負
    touchStartY = y;

    // 端での逆方向は吸収
    if (absorbEdgeIfNeeded(dy)) return;

    acc += dy;

    if (acc >= SCROLL_PER_SLIDE_PX) {
      slide(+1, "touch");
    } else if (acc <= -SCROLL_PER_SLIDE_PX) {
      slide(-1, "touch");
    }
  };
  const onTouchEnd = () => {
    touchStartY = null;
    acc = 0;
    lastTouchAt = Date.now();
  };
  area.addEventListener("touchstart", onTouchStart, { passive: false });
  area.addEventListener("touchmove", onTouchMove, { passive: false });
  area.addEventListener("touchend", onTouchEnd, { passive: false });
  area.addEventListener("touchcancel", onTouchEnd, { passive: false });

  // ===== ドット =====
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const i = Number(dot.dataset.index || 0);
      acc = 0; // クリック時も万全にクリア
      go(i);
      // 惰性wheelを拾いたくない場合、軽ロックを入れるなら下記：
      // lockAndWatch('wheel');
    });
  });

  // ===== リサイズ =====
  window.addEventListener("resize", () => {
    vh = window.innerHeight;
    applyTransform();
  });

  // ===== キーボード（任意）=====
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      slide(+1, "wheel");
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      slide(-1, "wheel");
    }
  });
})();
