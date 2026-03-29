import { GoogleGenAI } from "@google/genai";

/**
 * Genera el copy (títulos, subtítulos, textos) para todos los slides
 * usando Gemini como modelo de texto.
 */
export async function generateCopy(config) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { tema, cantidadSlides, tono, audiencia, tipografiaTitulos, tipografiaSubtitulos } = config;

  const prompt = `Sos un experto en contenido para redes sociales argentinas, especialmente carruseles de Instagram. Usás el voseo (vos, tenés, podés, sabés) y un tono profesional pero cercano, típico del español rioplatense.

Generá el contenido para un carrusel de EXACTAMENTE ${cantidadSlides} slides sobre el tema: "${tema}".

Parámetros:
- Tono: ${tono}
- Audiencia: ${audiencia}

REGLA FUNDAMENTAL — CANTIDAD DE SLIDES:
Debés generar EXACTAMENTE ${cantidadSlides} slides. Ni uno más, ni uno menos.
Si el tema parece corto, expandilo: desarmalo en subtemas, agregá ejemplos concretos, tips, datos, errores comunes, beneficios, pasos, preguntas frecuentes — lo que sea necesario para completar los ${cantidadSlides} slides con contenido valioso.

ESTRUCTURA OBLIGATORIA:
- Slide 1: PORTADA — título impactante + subtítulo que genere curiosidad
- Slides 2 a ${cantidadSlides - 1}: contenido clave, una idea por slide, variando layouts
- Slide ${cantidadSlides}: CTA — mensaje de cierre + acción concreta

LAYOUTS disponibles para slides interiores:
- "texto-imagen": título grande arriba + imagen ilustrativa abajo
- "texto-dos-columnas": título arriba + dos imágenes lado a lado (comparaciones)
- "texto-producto": título arriba a la izquierda + objeto grande centrado
- "card-oscura": concepto clave en card oscura con texto blanco
- "antes-despues": comparación visual con flecha (transformación)
- "solo-tipografia": tipografía dominante, sin imagen, para frases de impacto
- "mito-verdad": mito arriba tachado + verdad abajo en negrita

Respondé ÚNICAMENTE con JSON válido sin markdown ni explicaciones. El array "slides" debe tener EXACTAMENTE ${cantidadSlides} elementos:
{
  "slides": [
    { "numero": 1, "tipo": "portada", "layout": "portada", "titulo": "...", "subtitulo": "...", "texto": null, "ctaTexto": "SWIPE →" },
    { "numero": 2, "tipo": "contenido", "layout": "texto-imagen", "titulo": "...", "subtitulo": "...", "texto": "...", "ctaTexto": "SWIPE →" },
    { "numero": ${cantidadSlides}, "tipo": "cta", "layout": "texto-producto", "titulo": "...", "subtitulo": "...", "texto": "...", "ctaTexto": "GUARDAR →" }
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
