import { GoogleGenAI } from "@google/genai";

/**
 * Genera el caption de Instagram para el carrusel,
 * con emojis, estructura probada y hashtags optimizados.
 *
 * Best practices aplicadas (2025):
 * - Primera línea = hook que aparece antes del "más" — es lo más importante
 * - Emojis como bullets o separadores, no decoración vacía
 * - 3–5 párrafos cortos con saltos de línea (fácil de leer en mobile)
 * - CTA claro antes de los hashtags
 * - 5–10 hashtags específicos (Instagram penaliza el spam de hashtags)
 * - Mezcla: 2 nicho específico + 3 medios + 2 amplios
 */
export async function generateInstagramCopy(slides, config) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { tema, tono, audiencia } = config;

  // Resumen del contenido del carrusel para contexto
  const resumenSlides = slides
    .map((s) => `Slide ${s.numero} (${s.tipo}): "${s.titulo}"${s.subtitulo ? ` — ${s.subtitulo}` : ""}`)
    .join("\n");

  const prompt = `Sos un experto en contenido para Instagram con foco en carruseles de alto engagement. Usás el voseo rioplatense (vos, tenés, podés, hacés) y un tono profesional pero cercano, típico del español argentino.

Vas a escribir el caption perfecto para un carrusel de Instagram sobre: "${tema}"

Datos del carrusel:
${resumenSlides}

Tono: ${tono}
Audiencia: ${audiencia}

REGLAS DE CAPTION PARA INSTAGRAM (2025):
1. PRIMERA LÍNEA (hook): Es lo único que se ve antes del "más". Tiene que generar curiosidad o impacto inmediato. Máx 100 caracteres.
2. CUERPO: 3–4 párrafos cortos. Usá emojis como bullets o separadores, no como decoración vacía. Cada párrafo = 1–2 líneas.
3. CTA: Antes de los hashtags. Directo y específico ("Guardá este post", "Compartilo con alguien que...", "¿Te pasó esto? Contame en los comentarios").
4. HASHTAGS: 7–10 hashtags en español e inglés mezclados. Formato: 2 muy específicos de nicho + 4 medianos + 2 amplios. Ponerlos al final separados por un salto de línea.

Respondé SOLO con el caption listo para copiar y pegar, sin explicaciones, sin comillas alrededor, sin markdown.
El texto tiene que estar en el mismo idioma que el tema (si el tema está en español, el caption en español).`;

  console.log("📱 Generando caption de Instagram...");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const caption = response.candidates[0].content.parts[0].text.trim();
  console.log("✅ Caption generado");
  return caption;
}
