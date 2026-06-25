import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, type } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    const callMeBotKey = process.env.CALLMEBOT_API_KEY;
    const ultraMsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultraMsgToken = process.env.ULTRAMSG_TOKEN;

    if (!adminPhone) {
      console.warn("ADMIN_PHONE_NUMBER not set. Skipping admin alert.");
      return NextResponse.json({ status: "skipped" });
    }

    let success = false;
    let providerUsed = "none";

    // Primary Attempt: UltraMsg / GreenAPI (QR Code / Real SIM)
    if (ultraMsgInstance && ultraMsgToken) {
      try {
        const url = `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`;
        const params = new URLSearchParams();
        params.append("token", ultraMsgToken);
        params.append("to", adminPhone);
        params.append("body", message);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });

        if (res.ok) {
          success = true;
          providerUsed = "UltraMsg";
        } else {
          console.error("UltraMsg failed, triggering failover...");
        }
      } catch (err) {
        console.error("UltraMsg network error, triggering failover...", err);
      }
    }

    // Failover Attempt: CallMeBot (Free Bot API)
    if (!success && callMeBotKey) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${encodeURIComponent(message)}&apikey=${callMeBotKey}`;
        const res = await fetch(url, { method: "GET" });

        if (res.ok) {
          success = true;
          providerUsed = "CallMeBot";
        }
      } catch (err) {
        console.error("CallMeBot failover failed", err);
      }
    }

    if (success) {
      return NextResponse.json({ success: true, provider: providerUsed });
    } else {
      return NextResponse.json({ error: "All WhatsApp providers failed" }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("Admin Alert Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
