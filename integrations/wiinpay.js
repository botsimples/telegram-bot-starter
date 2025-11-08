const axios = require("axios");

// === INTEGRAÇÃO WIINPAY ===
async function gerarPix(plano, callbackUrl, credentials) {
  try {
    const { apiKey } = credentials;

    const res = await axios.post(
      "https://api.wiinpay.com.br/v1/pix",
      {
        amount: plano.price,
        description: plano.name,
        callback_url: callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      pixCode: res.data?.pixCopiaCola || res.data?.pix_code,
      paymentId: res.data?.id,
    };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro:", err.response?.data || err.message);
    return { pixCode: "ERRO_WIINPAY", paymentId: null };
  }
}

module.exports = { gerarPix };
