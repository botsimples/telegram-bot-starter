const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const { gerarPixWiinPay } = require("./integrations/wiinpay");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === VARIÁVEIS ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Erro MongoDB:", err.message));

// === MAPA DE PAGAMENTOS PENDENTES ===
const pagamentosPendentes = new Map();

// === FUNÇÃO: Enviar mensagem Telegram ===
async function sendMessage(chatId, text, options = {}) {
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      ...options,
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem Telegram:", err.response?.data || err.message);
  }
}

// === FUNÇÃO: Apagar mensagens anteriores ===
async function deleteMessage(chatId, messageId) {
  try {
    await axios.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (err) {
    // silencioso
  }
}

// === WEBHOOK PRINCIPAL DO TELEGRAM ===
app.post(`/webhook/${TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    const callback = update.callback_query;
    const chatId = callback?.message?.chat?.id;
    const data = callback?.data;
    const messageId = callback?.message?.message_id;

    if (!chatId) return res.sendStatus(200);

    // === BOTÃO: COMPRAR PLANO ===
    if (data === "comprar_plano") {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, "💳 Escolha o plano que deseja adquirir:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Mensal — R$9.97", callback_data: "plano_9.97" }],
          ],
        },
      });
    }

    // === SELECIONAR PLANO ===
    if (data.startsWith("plano_")) {
      const valor = parseFloat(data.split("_")[1]);

      // Limitar geração de PIX a cada 1 minuto
      const ultimoPix = pagamentosPendentes.get(chatId);
      if (ultimoPix && Date.now() - ultimoPix < 60 * 1000) {
        await sendMessage(chatId, "⚠️ Você precisa aguardar 1 minuto para gerar outro PIX.");
        return res.sendStatus(200);
      }

      pagamentosPendentes.set(chatId, Date.now());

      const pix = await gerarPixWiinPay(valor);
      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay.");
        return res.sendStatus(200);
      }

      // MENSAGEM 1: Aviso
      await sendMessage(
        chatId,
        `*Toque no código PIX abaixo para copiar:*\n\n⚠️ *Atenção*\nEste código PIX tem validade de 30 minutos.`
      );

      // MENSAGEM 2: Código PIX separado
      await sendMessage(chatId, `\`${pix.qr_code}\``);

      // MENSAGEM 3: Lembrete e botões
      await sendMessage(chatId,
        `⏰ *Lembrete:* O pagamento via PIX tem validade de *30 minutos*\!\n\n✅ Após efetuar o pagamento, se o sistema não reconhecer automaticamente, clique em *Verificar Pagamento*\.\n\n⚠️ Ao realizar o pagamento, você declara que leu e concorda com os Termos de Serviço e está ciente de que este é um produto digital de consumo imediato, não passível de reembolso por arrependimento\.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Verificar Pagamento", callback_data: `verificar_${pix.paymentId}` },
                { text: "📷 Ler QR Code", url: "https://pixcopiar.com.br/" },
              ],
              [{ text: "🆘 Suporte", url: "https://t.me/seusupport" }],
            ],
          },
        }
      );
    }

    // === BOTÃO: VERIFICAR PAGAMENTO ===
    if (data.startsWith("verificar_")) {
      const paymentId = data.split("_")[1];
      try {
        const response = await axios.get(`https://api-v2.wiinpay.com.br/v1/pix/${paymentId}`, {
          headers: { Authorization: `Bearer ${process.env.WIINPAY_API_KEY}` },
        });

        const status = response.data?.data?.status;
        if (status === "PAID") {
          await sendMessage(chatId, "🎉 Pagamento confirmado! Seu acesso foi liberado automaticamente.");
        } else {
          await sendMessage(chatId, "⏳ Pagamento ainda *não* foi confirmado. Tente novamente em alguns segundos.");
        }
      } catch (error) {
        await sendMessage(chatId, "❌ Erro ao verificar pagamento, tente novamente.");
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err);
    res.sendStatus(500);
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
