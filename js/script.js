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

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
})();

// kvスライダー ============================================
(() => {
  const container = document.querySelector(".kv-top");
  const track = document.getElementById("slider");
  const indicator = document.getElementById("indicator");

  // スライド要素取得＆無限ループ用クローン
  let slides = Array.from(track.children);
  const count = slides.length;
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[count - 1].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, slides[0]);
  slides = Array.from(track.children); // [lastClone, ...real, firstClone]

  // 状態
  let index = 1; // 実スライドの先頭位置（クローンを考慮）
  let itemSize = container.clientHeight;
  let timer = null;
  const interval = 5000;

  // ドット生成
  const dotButtons = [];
  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
    btn.addEventListener("click", () => {
      stop(); // 自動一旦止める（必要なら外してOK）
      goTo(i + 1, true);
      start();
    });
    li.appendChild(btn);
    indicator.appendChild(li);
    dotButtons.push(btn);
  }

  // 位置反映
  function applyTransform(animate) {
    track.style.transition = animate ? "transform .5s ease" : "none";
    track.style.transform = `translateY(${-(index * itemSize)}px)`;
  }

  // インジケータ更新
  function updateDots() {
    const active = (index - 1 + count) % count; // 0..count-1
    dotButtons.forEach((b, i) =>
      b.setAttribute("aria-current", i === active ? "true" : "false")
    );
  }

  function goTo(newIndex, animate = true) {
    index = newIndex;
    applyTransform(animate);
    updateDots();
  }

  // 初期配置（クローン分1枚下げる）
  goTo(1, false);

  // ループ処理（遷移完了後にジャンプを無アニメで調整）
  track.addEventListener("transitionend", () => {
    if (index === 0) {
      // 先頭の前（=lastClone）→ 実末尾へ
      index = count;
      applyTransform(false);
    } else if (index === count + 1) {
      // 末尾の次（=firstClone）→ 実先頭へ
      index = 1;
      applyTransform(false);
    }
  });

  // 自動再生
  function next() {
    goTo(index + 1, true);
  }
  function start() {
    if (timer) return;
    timer = setInterval(() => {
      // クローンを含む範囲で1つ進める
      if (index >= count + 1) {
        // 念のため整合
        index = 1;
        applyTransform(false);
      }
      next();
    }, interval);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }

  // リサイズ対応
  window.addEventListener("resize", () => {
    const prevHeight = itemSize;
    itemSize = container.clientHeight;
    if (itemSize !== prevHeight) applyTransform(false);
  });
  start();
})();

// ロード後のタイトルを初回アニメーションさせる
(() => {
  const track = document.getElementById("slider");
  if (!track) return;

  // クローン後の構造: [lastClone, ...real(0..n-1), firstClone]
  const slides = Array.from(track.children);
  if (slides.length < 3) return; // クローンが無いケース除外

  const firstReal = slides[1]; // 実スライド1枚目
  const title = firstReal.querySelector(".slide__title");
  if (!title) return;

  // クラス付与でアニメ発火 → 終わったら外して“1回きり”
  title.classList.add("title-intro");
  title.addEventListener(
    "animationend",
    () => {
      title.classList.remove("title-intro");
    },
    { once: true }
  );
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

// card
