const axios = require("axios");

// === INTEGRAÇÃO WIINPAY v2 (corrigido final) ===
async function gerarPix(plano, callbackUrl, credentials) {
  try {
    const { apiKey } = credentials;

    console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

    const res = await axios.post(
      "https://api-v2.wiinpay.com.br/payment/create",
      {
        api_key: apiKey,
        value: plano.price,
        name: plano.name || "Cliente Telegram",
        email: "lead@telegram.com",
        description: plano.description || "Plano VIP Telegram",
        webhook_url: callbackUrl,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", res.data);

    // 🔹 A API da WiinPay devolve "qr_code" e "paymentId"
    const data = res.data?.data || res.data;

    return {
      pixCode:
        data?.qr_code ||
        data?.pix_code ||
        data?.pixCopiaCola ||
        "ERRO_WIINPAY",
      paymentId: data?.paymentId || data?.id || null,
    };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro:", err.response?.data || err.message);
    return { pixCode: "ERRO_WIINPAY", paymentId: null };
  }
}

module.exports = { gerarPix };
