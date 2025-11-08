import axios from "axios";

// === GERAR PIX ===
export async function gerarPixWiinPay(valor, descricao = "Pagamento via BotSimples") {
  try {
    const apiKey = process.env.WIINPAY_API_KEY;
    const baseUrl = "https://api-v2.wiinpay.com.br";

    console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

    const response = await axios.post(
      `${baseUrl}/payment/create`,
      {
        api_key: apiKey,
        value: Number(valor),
        name: "Cliente BotSimples",
        email: "cliente@botsimples.com",
        description: descricao,
        webhook_url: process.env.WEBHOOK_URL || "https://telegram-bot-starter-ggy2.onrender.com/webhook",
        metadata: { origem: "telegram-bot" },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = response.data?.data || response.data || {};
    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", data);

    return {
      success: true,
      qr_code: data.qr_code || data.qrcode || data.qrCode || data.qr,
      paymentId: data.paymentId || data.id || data.transaction_id,
    };
  } catch (error) {
    console.error("❌ [WIINPAY] Erro ao gerar PIX:", error.response?.data || error.message);
    return { success: false, error: "ERRO_WIINPAY" };
  }
}

// === VERIFICAR PAGAMENTO ===
export async function verificarPixWiinPay(paymentId) {
  try {
    const apiKey = process.env.WIINPAY_API_KEY;
    const baseUrl = "https://api-v2.wiinpay.com.br";

    console.log(`🔍 [WIINPAY] Verificando pagamento ${paymentId}...`);

    const response = await axios.get(`${baseUrl}/payment/list/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    // Mostra tudo que veio da API
    console.log("🧾 [WIINPAY] Resposta bruta:", JSON.stringify(response.data, null, 2));

    const data = response.data;

    // ✅ Captura o status corretamente (estrutura real confirmada)
    const status =
      data?.data?.payment?.status || // formato principal do WiinPay
      data?.payment?.status ||
      data?.data?.status ||
      data?.data?.[0]?.status ||
      data?.status ||
      "UNKNOWN";

    console.log("🟢 [WIINPAY] Status detectado:", status);

    if (status?.toUpperCase() === "PAID" || status?.toUpperCase() === "CONFIRMED") {
      return { success: true, status: "PAID" };
    }

    return { success: false, status };
  } catch (error) {
    console.error("❌ [WIINPAY] Erro ao verificar PIX:", error.response?.data || error.message);
    return { success: false, error: "ERRO_VERIFICAR" };
  }
}
