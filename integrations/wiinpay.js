import axios from "axios";

export async function gerarPixWiinPay(valor, descricao = "Pagamento via BotSimples") {
  try {
    const apiKey = process.env.WIINPAY_API_KEY;
    const baseUrl = "https://api-v2.wiinpay.com.br";

    console.log("🟡 [WIINPAY] Gerando pagamento via API v2...");

    const response = await axios.post(
      `${baseUrl}/v2/pix`, // ✅ nova rota da versão 2
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
    console.error("❌ [WIINPAY] Erro ao gerar PIX:", error.response?.data || error.message);
    return { success: false, error: "ERRO_WIINPAY" };
  }
}
