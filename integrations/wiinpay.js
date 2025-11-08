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

    // Mostra tudo que veio para debug
    console.log("🧾 [WIINPAY] Resposta bruta:", JSON.stringify(response.data, null, 2));

    const data = response.data;

    // Captura o status em todas as estruturas conhecidas
    const status =
      data?.data?.status ||
      data?.data?.[0]?.status ||
      data?.payment?.status ||
      data?.response?.status ||
      data?.transaction?.status ||
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
