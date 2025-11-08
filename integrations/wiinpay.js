const axios = require("axios");

async function gerarPixWiinPay(valor, descricao = "Pagamento via BotSimples") {
  try {
    const apiKey = process.env.WIINPAY_API_KEY;
    const baseUrl = "https://api-v2.wiinpay.com.br";

    console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

    const response = await axios.post(
      `${baseUrl}/v1/pix`,
      {
        amount: valor,
        description: descricao,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data?.data || {};
    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", data);

    return {
      success: true,
      qr_code: data.qr_code,
      paymentId: data.paymentId,
    };
  } catch (error) {
    console.error("❌ [WIINPAY] Erro:", error.response?.data || error.message);
    return { success: false, error: "ERRO_WIINPAY" };
  }
}

module.exports = { gerarPixWiinPay };
