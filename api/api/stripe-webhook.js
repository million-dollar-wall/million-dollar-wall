
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false
  }
};

async function leggiCorpo(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Metodo non consentito");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let evento;

  try {
    const corpo = await leggiCorpo(req);

    evento = stripe.webhooks.constructEvent(
      corpo,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Firma webhook non valida:", error.message);
    return res.status(400).send("Firma non valida");
  }

  if (
    evento.type !== "checkout.session.completed" &&
    evento.type !== "checkout.session.async_payment_succeeded"
  ) {
    return res.status(200).json({ ricevuto: true });
  }

  const session = evento.data.object;

  if (session.payment_status !== "paid") {
    return res.status(200).json({ ricevuto: true });
  }

  const x = Number(session.metadata?.pixel_x);
  const y = Number(session.metadata?.pixel_y);
  const colore = session.metadata?.pixel_color;

  if (
    !Number.isInteger(x) || x < 0 || x >= 1000 ||
    !Number.isInteger(y) || y < 0 || y >= 1000 ||
    typeof colore !== "string" ||
    !/^#[0-9a-fA-F]{6}$/.test(colore)
  ) {
    return res.status(400).send("Dati del pixel non validi");
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data, error } = await supabase
    .from("pixels")
    .update({ status: "sold" })
    .eq("x", x)
    .eq("y", y)
    .eq("stripe_session_id", session.id)
    .eq("status", "reserved")
    .select("x");

  if (error) {
    console.error("Errore database:", error.message);
    return res.status(500).send("Errore database");
  }

  if (!data || data.length !== 1) {
    console.error("Pixel non trovato per la sessione:", session.id);
    return res.status(500).send("Pixel non confermato");
  }

  return res.status(200).json({ ricevuto: true });
}
