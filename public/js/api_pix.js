console.log("api_pix.js carregado ✔");

// ===============================
// 1. OPEN TOKEN MODAL
// ===============================
document.querySelectorAll("[data-open-token]").forEach(btn => {
  btn.addEventListener("click", () => {
    const gateway = btn.dataset.openToken;
    openTokenModal(gateway);
  });
});

// ===============================
// 2. CLOSE TOKEN MODAL
// ===============================
document.querySelectorAll("[data-close-token]").forEach(btn => {
  btn.addEventListener("click", () => {
    closeTokenModal();
  });
});

// ===============================
// 3. TOGGLE GATEWAY VISUAL
// ===============================
document.querySelectorAll("[data-toggle-gateway]").forEach(btn => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".gateway-card");
    const isActive = card.classList.contains("active");

    if (isActive) {
      card.classList.remove("active");
      btn.innerText = "Ativar Gateway";
      btn.classList.remove("on");

      const status = card.querySelector(".status");
      if (status) status.remove();

    } else {
      // Remove ativo dos outros
      document.querySelectorAll(".gateway-card").forEach(c => {
        c.classList.remove("active");
        const st = c.querySelector(".status");
        if (st) st.remove();
        const b = c.querySelector(".btn.toggle");
        if (b) {
          b.classList.remove("on");
          b.innerText = "Ativar Gateway";
        }
      });

      card.classList.add("active");
      btn.innerText = "Desativar";
      btn.classList.add("on");

      const top = card.querySelector(".top-line");
      const status = document.createElement("span");
      status.className = "status";
      status.innerText = "● Ativo";
      top.appendChild(status);
    }
  });
});

// ===============================
// 4. MODAL FUNCTIONS (iguais ao inline)
// ===============================
window.openTokenModal = function (gateway) {
  const modal = document.getElementById('tokenModal');
  const title = document.getElementById('modalTitle');
  const fields = document.getElementById('tokenFields');

  fields.innerHTML = "";
  title.textContent = `Integração - ${gateway}`;

  const configs = {
    'WiinPay': ['Token API'],
    'ParadisePag': ['Chave de API', 'Código do Produto'],
    'OasyFy': ['Public Key', 'Secret Key'],
    'PushinPay': ['API Token (Bearer)'],
    'SyncPay V2': ['Client ID (pública)', 'Client Secret (privada)'],
    'Hoopay': ['Client ID', 'Client Secret']
  };

  const campos = configs[gateway] || ['Token'];
  campos.forEach(campo => {
    const div = document.createElement("div");
    div.className = "field";
    div.innerHTML = `
      <label>${campo}</label>
      <input type="text" placeholder="Insira ${campo.toLowerCase()}..." />
    `;
    fields.appendChild(div);
  });

  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("visible"), 10);
};

window.closeTokenModal = function () {
  const modal = document.getElementById('tokenModal');
  modal.style.opacity = "0";
  setTimeout(() => {
    modal.classList.remove("visible");
    modal.classList.add("hidden");
    modal.style.opacity = "";
  }, 300);
};
