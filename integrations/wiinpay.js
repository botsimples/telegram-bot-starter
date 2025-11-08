import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * 🔹 Gera um pagamento PIX via WiinPay
 */
export async function gerarPixWiinPay(valor) {
  try {
    console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

    const response = await axios.post(
      "https://api.wiinpay.com/v2/payments",
      {
        name: "BotSimples",
        email: "cliente@botsimples.com",
        value: valor,
        webhookUrl: `${process.env.BASE_URL}/webhook`,
        metadata: { origem: "telegram-bot" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WIINPAY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data?.data || {};
    console.log("🟢 [WIINPAY] PIX gerado com sucesso:", data);

    return {
      success: true,
      qr_code: data.pixCode,
      paymentId: data.paymentId,
    };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao gerar pagamento:", err.response?.data || err.message);
    return { success: false };
  }
}

/**
 * 🔹 Verifica status do pagamento PIX via WiinPay
 */
export async function verificarPixWiinPay(paymentId) {
  try {
    console.log(`🔍 [WIINPAY] Verificando pagamento ${paymentId}...`);

    const response = await axios.get(`https://api.wiinpay.com/v2/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.WIINPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data?.data?.payment || {};
    console.log("🧾 [WIINPAY] Resposta bruta:", JSON.stringify(data, null, 2));
    console.log("🟢 [WIINPAY] Status detectado:", data.status);

    return { success: true, status: data.status };
  } catch (err) {
    console.error("❌ [WIINPAY] Erro ao verificar pagamento:", err.response?.data || err.message);
    return { success: false, status: "UNKNOWN" };
  }
}
