import axios from "axios";

const BASE_URL = "https://api-v2.wiinpay.com.br"; // 🔥 removido o /api

// === GERAR PIX ===
export async function gerarPixWiinPay(valor) {
  console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

  try {
    const payload = {
      name: "Cliente BotSimples",
      email: "cliente@botsimples.com",
      value: valor,
      metadata: { origem: "telegram-bot" },
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WIINPAY_TOKEN}`,
    };

    const { data } = await axios.post(`${BASE_URL}/payment/pix`, payload, { headers });

    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", data);
    return {
      success: true,
      qr_code: data.qr_code,
      paymentId: data.paymentId,
    };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao gerar pagamento:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

// === VERIFICAR PIX ===
export async function verificarPixWiinPay(paymentId) {
  console.log(`🔍 [WIINPAY] Verificando pagamento ${paymentId}...`);

  try {
    const headers = {
      Authorization: `Bearer ${process.env.WIINPAY_TOKEN}`,
    };

    const { data } = await axios.get(`${BASE_URL}/payment/${paymentId}`, { headers });

    console.log("🧾 [WIINPAY] Resposta bruta:", JSON.stringify(data, null, 2));

    const status = data.payment?.status?.toUpperCase() || "UNKNOWN";
    console.log("🟢 [WIINPAY] Status detectado:", status);

    return { success: true, status };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao verificar pagamento:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}
