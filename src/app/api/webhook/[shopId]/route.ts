import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params;
  const event = new URL(req.url).searchParams.get("event") || "cart";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const admin = createAdmin();
  const { data: shop } = await admin
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop) return NextResponse.json({ error: "Boutique inconnue" }, { status: 404 });

  const email = String(
    body.email ?? body.billing?.email ?? body.customer?.email ?? ""
  )
    .trim()
    .toLowerCase();
  const total = Number(body.total_price ?? body.total ?? 0) || 0;
  if (!email) return NextResponse.json({ error: "Email manquant" }, { status: 400 });

  // Commande passée : récupéré uniquement si une relance a déjà été envoyée
  if (event === "order") {
    const { data: cart } = await admin
      .from("carts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("customer_email", email)
      .eq("status", "reminded")
      .order("abandoned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cart) {
      await admin
        .from("carts")
        .update({
          status: "recovered",
          recovered_at: new Date().toISOString(),
          recovered_amount: total,
        })
        .eq("id", cart.id);
    }
    return NextResponse.json({ ok: true });
  }

  // Panier abandonné : on l'enregistre et on programme les deux relances
  const externalId = String(body.id ?? body.token ?? "");
  if (!externalId) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const { data: cart, error } = await admin
    .from("carts")
    .upsert(
      {
        shop_id: shopId,
        external_id: externalId,
        customer_email: email,
        cart_total: total,
        cart_url: body.abandoned_checkout_url ?? body.cart_url ?? null,
      },
      { onConflict: "shop_id,external_id" }
    )
    .select("id")
    .single();
  if (error || !cart) {
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }

  const now = Date.now();
  await admin.from("reminders").upsert(
    [
      { cart_id: cart.id, step: 1, scheduled_at: new Date(now + 3600_000).toISOString() },
      { cart_id: cart.id, step: 2, scheduled_at: new Date(now + 86_400_000).toISOString() },
    ],
    { onConflict: "cart_id,step", ignoreDuplicates: true }
  );

  return NextResponse.json({ ok: true });
}
