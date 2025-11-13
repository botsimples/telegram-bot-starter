// tigerfy.js — Script universal do painel TigerFy
document.addEventListener("DOMContentLoaded", () => {

  // ============================
  // 1. Corrige links com data-link
  // ============================
  document.querySelectorAll("[data-link]").forEach(el => {
    el.addEventListener("click", () => {
      const to = el.getAttribute("data-link");
      if (to) window.location.href = to;
    });
  });

  // ============================
  // 2. Controle de modais
  // ============================
  const modal = document.querySelector(".modal");
  if (modal) {
    document.querySelectorAll("[data-modal-open]").forEach(btn => {
      btn.addEventListener("click", () => modal.classList.add("active"));
    });

    document.querySelectorAll("[data-modal-close]").forEach(btn => {
      btn.addEventListener("click", () => modal.classList.remove("active"));
    });
  }

  // ============================
  // 3. Tabs universais
  // ============================
  document.querySelectorAll("[data-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      let group = tab.dataset.group;
      let target = tab.dataset.tab;

      document.querySelectorAll(`[data-group="${group}"]`).forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(`[data-content="${group}"]`).forEach(c => c.classList.add("hidden"));
      document.getElementById(target).classList.remove("hidden");
    });
  });

  // ============================
  // 4. Botões com loading
  // ============================
  document.querySelectorAll("[data-loading]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.add("loading");
      setTimeout(() => btn.classList.remove("loading"), 1500);
    });
  });

  // ============================
  // 5. Hover dos cards do dashboard
  // ============================
  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("mouseenter", () => card.classList.add("hover"));
    card.addEventListener("mouseleave", () => card.classList.remove("hover"));
  });

  // ============================
  // 6. Corrige foco/scroll
  // ============================
  window.scrollTo(0, 0);

});
