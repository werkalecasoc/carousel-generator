import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

/**
 * Genera una imagen para un slide usando Nano Banana (Gemini Image Generation).
 * Solo usa el prompt de texto — NO pasa la imagen de referencia al generador
 * para que cree una imagen nueva en ese estilo, no que edite la original.
 */
export async function generateSlide(prompt, styleImagePath, outputPath, model = "gemini-3.1-flash-image-preview") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "4:5",
        imageSize: "2K",
      },
    },
  });

  let imageSaved = false;

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageBuffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, imageBuffer);
      imageSaved = true;
    }
  }

  if (!imageSaved) {
    throw new Error(`Nano Banana no devolvió imagen para: ${outputPath}`);
  }

  return outputPath;
}
