import axios from "axios";

const BASE_URL = "https://api-v2.wiinpay.com.br";

export async function gerarPixWiinPay(valor) {
  console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

  try {
    const payload = {
      api_key: process.env.WIINPAY_TOKEN,
      value: valor,
      name: "Cliente BotSimples",
      email: "cliente@botsimples.com",
      description: "Pagamento via BotSimples",
      webhook_url: `${process.env.WEBHOOK_URL || "https://telegram-bot-starter-ggy2.onrender.com/webhook"}`,
      metadata: { origem: "telegram-bot" },
    };

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const { data } = await axios.post(`${BASE_URL}/payment/create`, payload, { headers });

    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", data);
    return {
      success: true,
      qr_code: data.qr_code || data.payment?.pixCode,
      paymentId: data.paymentId || data.payment?.paymentId,
    };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao gerar pagamento:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

export async function verificarPixWiinPay(paymentId) {
  console.log(`🔍 [WIINPAY] Verificando pagamento ${paymentId}...`);

  try {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.WIINPAY_TOKEN}`,
    };

    const { data } = await axios.get(`${BASE_URL}/payment/list/${paymentId}`, { headers });

    console.log("🧾 [WIINPAY] Resposta bruta:", JSON.stringify(data, null, 2));

    const status = data.payment?.status?.toUpperCase() || "UNKNOWN";
    console.log("🟢 [WIINPAY] Status detectado:", status);

    return { success: true, status };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao verificar pagamento:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}
