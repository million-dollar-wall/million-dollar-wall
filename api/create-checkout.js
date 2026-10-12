
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  try {
    const { x, y, color } = req.body || {};

    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 || x >= 1000 ||
      y < 0 || y >= 1000 ||
      typeof color !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(color)
    ) {
      return res.status(400).json({
        error: "Dati del pixel non validi"
      });
    }

    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY
    );

    const supabaseUrl = process.env.SUPABASE_URL?.trim();

console.log("SUPABASE_URL presente:", Boolean(supabaseUrl));
console.log("SUPABASE_URL valida:", /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl || ""));

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SECRET_KEY
);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `The Million Dollar Wall — pixel ${x + 1}, ${y + 1}`
            },
            unit_amount: 100
          },
          quantity: 1
        }
      ],
      metadata: {
        pixel_x: String(x),
        pixel_y: String(y),
        pixel_color: color
      },
      success_url:
        `${process.env.SITE_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${process.env.SITE_URL}/?annullato=true`
    });

    const { data: prenotato, error } = await supabase.rpc(
      "reserve_pixel",
      {
        p_x: x,
        p_y: y,
        p_color: color,
        p_session_id: session.id
      }
    );

    if (error) {
      console.error("Errore prenotazione:", error.message);
      return res.status(500).json({
        error: "Impossibile riservare il pixel"
      });
    }

    if (!prenotato) {
      return res.status(409).json({
        error: "Questo pixel è già occupato o riservato"
      });
    }

    return res.status(200).json({
      url: session.url
    });
  } catch (error) {
    console.error("Errore checkout:", error.message);
    return res.status(500).json({
      error: "Impossibile avviare il pagamento"
    });
  }
}
