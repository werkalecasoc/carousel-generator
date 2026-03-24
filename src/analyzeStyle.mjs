import { GoogleGenAI } from "@google/genai";
import fs from "fs";

/**
 * Analiza una imagen de referencia y extrae su estilo visual en texto detallado.
 * Ese texto se inyecta luego en cada prompt de generación para que el modelo
 * respete el estilo aunque no "vea" la imagen directamente.
 */
export async function analyzeStyle(imagePath, tipo = "portada") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageBytes  = fs.readFileSync(imagePath);
  const imageBase64 = imageBytes.toString("base64");
  const mimeType    = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const pregunta = tipo === "portada"
    ? `Analizá esta imagen de portada de carrusel de Instagram con máximo detalle visual.
       Describí: paleta exacta de colores (hex aproximados), temperatura del color, tipo de fotografía,
       iluminación, composición, posición y tamaño de la tipografía sobre la imagen, estilo editorial,
       mood general, texturas, contraste, saturación. Sé muy específico y técnico.
       Formato: párrafo descriptivo continuo en inglés, orientado a ser usado como prompt de generación de imagen.`
    : `Analizá esta imagen interior de carrusel de Instagram con máximo detalle visual.
       Describí: color de fondo exacto (hex aproximado), paleta de colores usada, temperatura,
       estilo tipográfico (tamaño relativo, peso, mezcla de estilos), jerarquía visual,
       elementos decorativos (flechas, líneas, cards, botones pill), espaciado y márgenes,
       mood general, estilo de fotografías o ilustraciones embebidas si las hay.
       Formato: párrafo descriptivo continuo en inglés, orientado a ser usado como prompt de generación de imagen.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { mimeType, data: imageBase64 } },
      pregunta,
    ],
  });

  return response.candidates[0].content.parts[0].text.trim();
}
