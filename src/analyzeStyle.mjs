import { GoogleGenAI } from "@google/genai";
import fs from "fs";

/**
 * Analiza una imagen de referencia y extrae su ESTILO VISUAL en texto detallado.
 * Este texto se inyecta en el prompt de generación para que el modelo
 * CREE UNA IMAGEN NUEVA con ese estilo — no copia ni edita la original.
 */
export async function analyzeStyle(imagePath, tipo = "portada") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageBytes  = fs.readFileSync(imagePath);
  const imageBase64 = imageBytes.toString("base64");
  const mimeType    = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const pregunta = `Analizá esta imagen y extraé ÚNICAMENTE su estilo visual para usarlo como guía de diseño.
NO describas el contenido ni los objetos de la imagen.
SÍ describí con precisión técnica:

1. FONDO (muy importante): describí exactamente el fondo — ¿es color plano (hex exacto)? ¿degradado (colores y dirección)? ¿textura (papel, tela, granulado, ruido)? ¿imagen fotográfica? ¿patrón geométrico? Sé muy específico.
2. PALETA: colores exactos usados (hex aproximados), temperatura (cálida/fría/neutra)
3. TIPOGRAFÍA VISUAL: ¿bold/light/mixed? ¿tiene sombras? ¿outline? ¿mezcla serif+sans? ¿tamaños relativos entre título y cuerpo?
4. ESTILO GRÁFICO: ¿fotografía? ¿ilustración? ¿3D render? ¿flat design? ¿minimalista? ¿ornamentado?
5. ELEMENTOS DECORATIVOS: ¿líneas? ¿flechas? ¿pills/botones? ¿íconos? ¿overlays? ¿shapes geométricos?
6. COMPOSICIÓN: ¿cómo se distribuyen los elementos? ¿márgenes amplios o ajustados?
7. SOMBRAS Y PROFUNDIDAD: ¿drop shadows? ¿glassmorphism? ¿todo plano?
8. MOOD GENERAL: ¿premium/editorial? ¿corporate? ¿playful? ¿minimalista?

Respondé en inglés, en párrafo continuo orientado a ser usado como prompt de generación de imagen. Empezá siempre por el fondo. Sé muy específico y técnico. Máximo 250 palabras.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { mimeType, data: imageBase64 } },
      pregunta,
    ],
  });

  return response.candidates[0].content.parts[0].text.trim();
}
