import { redirect } from "next/navigation";
import { createAdmin } from "@/lib/supabase/server";

async function confirmUnsubscribe(formData: FormData) {
  "use server";
  const cartId = String(formData.get("cartId") || "");
  const admin = createAdmin();
  const { data: cart } = await admin
    .from("carts")
    .select("shop_id, customer_email")
    .eq("id", cartId)
    .maybeSingle();
  if (cart) {
    await admin
      .from("unsubscribes")
      .upsert(
        { shop_id: cart.shop_id, email: cart.customer_email },
        { onConflict: "shop_id,email" }
      );
  }
  redirect(`/unsubscribe/${cartId}?done=1`);
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ cartId: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { cartId } = await params;
  const { done } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      {done ? (
        <>
          <h1 className="mb-3 text-2xl font-bold">C'est fait</h1>
          <p className="text-gray-600">
            Vous ne recevrez plus de rappels de panier de la part de cette boutique.
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-3 text-2xl font-bold">Se désinscrire</h1>
          <p className="mb-6 text-gray-600">
            Confirmez pour ne plus recevoir de rappels de panier de la part de cette boutique.
          </p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="cartId" value={cartId} />
            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white"
            >
              Me désinscrire
            </button>
          </form>
        </>
      )}
    </main>
  );
}
