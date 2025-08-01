document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.querySelector(".header__toggle");
  const navWrapper = document.querySelector(".header__nav-wrapper");

  toggleBtn.addEventListener("click", function () {
    toggleBtn.classList.toggle("is-active"); // ← ボタンにクラス追加
    navWrapper.classList.toggle("is-active");
  });
});
