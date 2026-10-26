import { redirect } from "next/navigation";
import { createClient, createAdmin } from "@/lib/supabase/server";

const BASE = "https://panier-perdu-teal.vercel.app";

async function sendTest() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!shop) redirect("/dashboard/test?r=noshop");

  const admin = createAdmin();
  const now = Date.now();
  const { data: cart, error } = await admin
    .from("carts")
    .insert({
      shop_id: shop.id,
      external_id: `test-${now}`,
      customer_email: user.email,
      cart_total: 49.9,
      cart_url: BASE,
    })
    .select("id")
    .single();
  if (error || !cart) redirect("/dashboard/test?r=error");

  await admin.from("reminders").insert([
    { cart_id: cart.id, step: 1, scheduled_at: new Date(now - 1000).toISOString() },
    { cart_id: cart.id, step: 2, scheduled_at: new Date(now + 86_400_000).toISOString() },
  ]);

  const res = await fetch(`${BASE}/api/cron/send-reminders`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    cache: "no-store",
  });
  const out = await res.json().catch(() => ({}));
  redirect(`/dashboard/test?r=done&sent=${out.sent ?? 0}`);
}

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; sent?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { r, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="mb-4 text-2xl font-bold">Test d'envoi</h1>
      <p className="mb-6 text-sm text-gray-600">
        Crée un faux panier à ton adresse ({user.email}) et envoie la première
        relance tout de suite.
      </p>
      <form action={sendTest}>
        <button
          type="submit"
          className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white"
        >
          Envoyer un faux panier de test
        </button>
      </form>
      {r === "done" && (
        <p className="mt-6 rounded-lg bg-gray-100 p-4 text-sm">
          Terminé : {sent} email(s) envoyé(s). Regarde ta boîte mail (et les spams).
        </p>
      )}
      {r === "noshop" && (
        <p className="mt-6 text-sm text-red-700">
          Ajoute d'abord une boutique dans le tableau de bord.
        </p>
      )}
      {r === "error" && (
        <p className="mt-6 text-sm text-red-700">
          Le faux panier n'a pas pu être créé.
        </p>
      )}
    </main>
  );
}
