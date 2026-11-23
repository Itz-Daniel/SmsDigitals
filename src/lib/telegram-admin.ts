export function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function notifyTelegramAdmin(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

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
  const msg = `🚨 <b>SMS PROVIDER BALANCE ALERT</b>\n\nProvider: <b>${escapeHtml(providerName.toUpperCase())}</b>\nStatus: ⚠️ Balance Low / Depleted (${escapeHtml(balanceText)})\nAction Required: Please refill provider balance immediately to avoid customer order failures.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyProviderOfflineAlert(providerName: string, reason: string) {
  const msg = `⚠️ <b>SMS PROVIDER OFFLINE ALERT</b>\n\nProvider: <b>${escapeHtml(providerName.toUpperCase())}</b>\nStatus: 🔴 Offline / Unreachable\nReason: ${escapeHtml(reason)}\nAction: Waterfall auto-routing activated to backup providers.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyStockOutAlert(serviceName: string, country: string) {
  const msg = `📦 <b>OUT OF STOCK ALERT</b>\n\nService: <b>${escapeHtml(serviceName)}</b>\nCountry: <b>${escapeHtml(country.toUpperCase())}</b>\nStatus: ❌ Number unavailable across all 5 providers.\nAction: Replenish provider pools or adjust pricing floors.`;
  await notifyTelegramAdmin(msg);
}

export async function notifyDepositAlert(
  userEmailOrParams: string | { userEmail: string; amount: string | number; method?: string; gateway?: string; reference?: string },
  amount?: number | string,
  currency?: string,
  gateway?: string
) {
  let userEmail = "";
  let amountStr = "";
  let gatewayStr = "";

  if (typeof userEmailOrParams === "object" && userEmailOrParams !== null) {
    userEmail = userEmailOrParams.userEmail;
    amountStr = String(userEmailOrParams.amount);
    gatewayStr = userEmailOrParams.method || userEmailOrParams.gateway || "Crypto";
  } else {
    userEmail = userEmailOrParams;
    amountStr = `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;
    gatewayStr = gateway || "Online";
  }

  const msg = `💵 <b>NEW WALLET DEPOSIT SUCCESSFUL</b>\n\nUser: <code>${escapeHtml(userEmail)}</code>\nAmount: <b>${escapeHtml(amountStr)}</b>\nGateway: <b>${escapeHtml(gatewayStr)}</b>`;
  await notifyTelegramAdmin(msg);
}
