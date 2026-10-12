
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  try {
    const sessionId = req.query.session_id;

    if (
      typeof sessionId !== "string" ||
      !sessionId.startsWith("cs_")
    ) {
      return res.status(400).json({
        error: "Sessione non valida"
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(402).json({
        paid: false,
        message: "Pagamento non confermato"
      });
    }

    return res.status(200).json({
      paid: true
    });
  } catch (error) {
    console.error("Errore verifica sessione:", error.message);
    return res.status(500).json({
      error: "Impossibile verificare il pagamento"
    });
  }
}
