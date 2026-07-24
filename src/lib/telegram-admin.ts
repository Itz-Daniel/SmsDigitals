export async function notifyTelegramAdmin(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) {
    console.log(`[Admin Alert]: ${message}`);
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram Admin Notification Error:", err);
  }
}

export async function notifyLowBalanceAlert(providerName: string, currentBalance?: number) {
  const balanceText = currentBalance !== undefined ? `$${currentBalance.toFixed(2)}` : 'OUT OF CREDIT / LOW';
  const msg = `🚨 <b>SMS PROVIDER BALANCE ALERT</b>\n\nProvider: <b>${providerName.toUpperCase()}</b>\nStatus: ⚠️ Balance Low / Depleted (${balanceText})\nAction Required: Please refill provider balance immediately to avoid customer order failures.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyProviderOfflineAlert(providerName: string, reason: string) {
  const msg = `⚠️ <b>SMS PROVIDER OFFLINE ALERT</b>\n\nProvider: <b>${providerName.toUpperCase()}</b>\nStatus: 🔴 Offline / Unreachable\nReason: ${reason}\nAction: Waterfall auto-routing activated to backup providers.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyStockOutAlert(serviceName: string, country: string) {
  const msg = `📦 <b>OUT OF STOCK ALERT</b>\n\nService: <b>${serviceName}</b>\nCountry: <b>${country.toUpperCase()}</b>\nStatus: ❌ Number unavailable across all 5 providers.\nAction: Replenish provider pools or adjust pricing floors.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyDepositAlert(userEmail: string, amount: number, currency: string, gateway: string) {
  const msg = `💵 <b>NEW WALLET DEPOSIT SUCCESSFUL</b>\n\nUser: <code>${userEmail}</code>\nAmount: <b>${currency} ${amount.toLocaleString()}</b>\nGateway: <b>${gateway}</b>`;
  await notifyTelegramAdmin(msg);
}
