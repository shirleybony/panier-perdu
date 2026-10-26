"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setMessage(error.message);
      return setMessage("Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage("Email ou mot de passe incorrect.");
    window.location.href = "/dashboard";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "login" ? "Connexion" : "Créer mon compte"}
      </h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Mot de passe (8 caractères minimum)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "Me connecter" : "Créer mon compte"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-sm text-gray-500 underline"
      >
        {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Me connecter"}
      </button>
    </main>
  );
}
