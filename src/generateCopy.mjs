import { GoogleGenAI } from "@google/genai";

/**
 * Genera el copy (títulos, subtítulos, textos) para todos los slides
 * usando Gemini como modelo de texto.
 */
export async function generateCopy(config) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { tema, cantidadSlides, tono, audiencia, tipografiaTitulos, tipografiaSubtitulos } = config;

  const prompt = `Sos un experto en contenido para redes sociales argentinas, especialmente carruseles de Instagram. Usás el voseo (vos, tenés, podés, sabés) y un tono profesional pero cercano, típico del español rioplatense.

Genera el contenido para un carrusel de ${cantidadSlides} slides sobre el tema: "${tema}".

Parámetros:
- Tono: ${tono}
- Audiencia: ${audiencia}
- Fuente de títulos: ${tipografiaTitulos}
- Fuente de subtítulos: ${tipografiaSubtitulos}

REGLAS DE CONTENIDO:
- Slide 1: PORTADA — título impactante + subtítulo breve que genere curiosidad.
- Último slide: CTA — mensaje de cierre + acción concreta.
- Slides del medio: contenido clave, una idea por slide.

REGLAS DE LAYOUT — para cada slide elige el layout más adecuado:

"portada" → solo para el slide 1, foto full-bleed con texto encima.

Para slides interiores, elige uno de estos layouts:
- "texto-imagen": título grande arriba + imagen ilustrativa abajo en card redondeada
- "texto-dos-columnas": título arriba + dos imágenes lado a lado (para comparaciones o ejemplos)
- "texto-producto": título arriba a la izquierda + producto/objeto grande centrado respira en el fondo
- "card-oscura": concepto clave en card oscura redondeada con texto blanco + pequeña imagen accent
- "antes-despues": texto arriba + comparación visual con flecha (para mostrar transformación)
- "solo-tipografia": slide dominado por tipografía grande, sin imagen, para frases de impacto

Responde ÚNICAMENTE con un JSON válido sin markdown ni explicaciones:
{
  "slides": [
    {
      "numero": 1,
      "tipo": "portada",
      "layout": "portada",
      "titulo": "...",
      "subtitulo": "...",
      "texto": null,
      "ctaTexto": "SWIPE →"
    },
    {
      "numero": 2,
      "tipo": "contenido",
      "layout": "texto-imagen",
      "titulo": "...",
      "subtitulo": "...",
      "texto": "...",
      "ctaTexto": "SWIPE →"
    },
    ...
    {
      "numero": ${cantidadSlides},
      "tipo": "cta",
      "layout": "texto-producto",
      "titulo": "...",
      "subtitulo": "...",
      "texto": "...",
      "ctaTexto": "GUARDAR →"
    }
  ]
}`;

  console.log("📝 Generando copy con Gemini...");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const rawText = response.candidates[0].content.parts[0].text.trim();
  const jsonText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const data = JSON.parse(jsonText);
    console.log(`✅ Copy generado: ${data.slides.length} slides`);
    return data.slides;
  } catch (err) {
    console.error("❌ Error parseando JSON del copy:", rawText);
    throw new Error("Gemini no devolvió JSON válido para el copy.");
  }
}
