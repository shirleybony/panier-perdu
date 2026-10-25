import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function addShop(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const platform = String(formData.get("platform") || "");
  const storeUrl = String(formData.get("store_url") || "").trim();
  const code = String(formData.get("discount_code") || "").trim();
  if (!name || !storeUrl || !["shopify", "woocommerce"].includes(platform)) return;

  await supabase.from("shops").insert({
    owner_id: user.id,
    name,
    platform,
    store_url: storeUrl,
    discount_code: code || null,
  });
  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shops } = await supabase
    .from("shops")
    .select("id, name, platform, store_url, discount_code")
    .order("created_at", { ascending: false });

  const { data: carts } = await supabase
    .from("carts")
    .select("status, recovered_amount");

  const recovered = (carts ?? []).filter((c) => c.status === "recovered");
  const totalRecovered = recovered.reduce(
    (sum, c) => sum + Number(c.recovered_amount ?? 0),
    0
  );
  const base = "https://panier-perdu-teal.vercel.app";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold">Mon tableau de bord</h1>

      <section className="mb-10 rounded-2xl bg-green-50 p-6">
        <p className="text-sm text-green-800">Chiffre d'affaires récupéré</p>
        <p className="text-4xl font-bold text-green-900">
          {totalRecovered.toFixed(2).replace(".", ",")} €
        </p>
        <p className="mt-1 text-sm text-green-800">
          {recovered.length} panier{recovered.length > 1 ? "s" : ""} récupéré
          {recovered.length > 1 ? "s" : ""}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Mes boutiques</h2>
        {(shops ?? []).length === 0 && (
          <p className="text-sm text-gray-500">Aucune boutique pour l'instant.</p>
        )}
        <ul className="space-y-4">
          {(shops ?? []).map((s) => (
            <li key={s.id} className="rounded-xl border border-gray-200 p-4">
              <p className="font-semibold">
                {s.name}{" "}
                <span className="text-sm font-normal text-gray-500">({s.platform})</span>
              </p>
              <p className="text-sm text-gray-500">{s.store_url}</p>
              {s.discount_code && (
                <p className="text-sm text-gray-500">Code : {s.discount_code}</p>
              )}
              <p className="mt-3 text-xs text-gray-500">Adresse de branchement :</p>
              <p className="break-all rounded bg-gray-100 p-2 text-xs">
                {base}/api/webhook/{s.id}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Ajouter une boutique</h2>
        <form action={addShop} className="space-y-3">
          <input
            name="name"
            required
            placeholder="Nom de la boutique"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <select
            name="platform"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          >
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
          </select>
          <input
            name="store_url"
            required
            placeholder="Adresse de la boutique (https://...)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            name="discount_code"
            placeholder="Code de réduction pour la 2e relance (facultatif)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white"
          >
            Ajouter la boutique
          </button>
        </form>
      </section>
    </main>
  );
}
