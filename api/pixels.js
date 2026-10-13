
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL?.trim(),
      process.env.SUPABASE_SECRET_KEY
    );

    const { data, error } = await supabase
      .from("pixels")
      .select("x, y, color")
      .eq("status", "sold")
      .limit(1000000);

    if (error) {
      console.error("Errore lettura pixel:", error.message);
      return res.status(500).json({
        error: "Impossibile caricare i pixel"
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      pixels: data || []
    });
  } catch (error) {
    console.error("Errore API pixel:", error.message);
    return res.status(500).json({
      error: "Errore interno"
    });
  }
}
