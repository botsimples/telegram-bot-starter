console.log("TigerFy JS carregado corretamente");

// Criar oferta
document.querySelectorAll("[data-action='go-create']").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "/bots/create";
  });
});

// Gerenciar ofertas
document.querySelectorAll("[data-action='go-manage']").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "/bots/manage";
  });
});

// ROI
document.querySelectorAll("[data-action='go-roi']").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "/bots/roi";
  });
});

// Modais de gateways
document.querySelectorAll("[data-gateway]").forEach(btn => {
  btn.addEventListener("click", () => {
    const gw = btn.dataset.gateway;
    alert("Gateway: " + gw);
  });
});

// Ativar/Desativar gateway
document.querySelectorAll("[data-toggle]").forEach(btn => {
  btn.addEventListener("click", () => {
    const gw = btn.dataset.toggle;
    alert("Alterando gateway: " + gw);
  });
});
