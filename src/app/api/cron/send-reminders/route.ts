import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "https://panier-perdu-teal.vercel.app";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  unsubscribeUrl: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to,
      subject,
      html,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
    }),
  });
  return res.ok;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdmin();
  const { data: due } = await admin
    .from("reminders")
    .select(
      "id, step, cart_id, carts(id, status, shop_id, customer_email, cart_total, cart_url, shops(name, discount_code))"
    )
    .is("sent_at", null)
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  let sent = 0;
  for (const r of (due ?? []) as any[]) {
    const cart = r.carts;
    const shop = cart?.shops;

    const markDone = () =>
      admin
        .from("reminders")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", r.id);

    if (!cart || !shop || cart.status === "recovered" || !cart.cart_url) {
      await markDone();
      continue;
    }

    const { data: unsub } = await admin
      .from("unsubscribes")
      .select("email")
      .eq("shop_id", cart.shop_id)
      .eq("email", cart.customer_email)
      .maybeSingle();
    if (unsub) {
      await markDone();
      continue;
    }

    const shopName = esc(String(shop.name));
    const total = Number(cart.cart_total).toFixed(2).replace(".", ",");
    const withCode = r.step === 2 && shop.discount_code;
    const unsubscribeUrl = `${BASE}/unsubscribe/${cart.id}`;
    const subject =
      r.step === 1
        ? `Vous avez oublié quelque chose chez ${shop.name}`
        : `Votre panier chez ${shop.name} vous attend toujours`;
    const html = `
      <p>Bonjour,</p>
      <p>Votre panier de ${total} € chez ${shopName} n'a pas été finalisé.</p>
      ${withCode ? `<p>Pour vous aider à vous décider, utilisez le code <strong>${esc(String(shop.discount_code))}</strong>.</p>` : ""}
      <p><a href="${esc(String(cart.cart_url))}">Retrouver mon panier</a></p>
      <p>À bientôt chez ${shopName}.</p>
      <p style="font-size:12px;color:#6b7280">
        Vous recevez ce message car vous avez laissé un panier chez ${shopName}.
        <a href="${unsubscribeUrl}">Se désinscrire</a>
      </p>
    `;

    const ok = await sendEmail(cart.customer_email, subject, html, unsubscribeUrl);
    if (ok) {
      await markDone();
      if (r.step === 1) {
        await admin
          .from("carts")
          .update({ status: "reminded" })
          .eq("id", cart.id)
          .eq("status", "abandoned");
      }
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
