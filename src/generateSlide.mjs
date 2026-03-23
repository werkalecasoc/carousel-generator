import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

/**
 * Genera una imagen para un slide usando Nano Banana (Gemini Image Generation).
 * Usa la imagen de referencia de estilo como guía visual.
 *
 * @param {string} prompt - Prompt de texto para la imagen
 * @param {string} styleImagePath - Ruta a la imagen de referencia de estilo
 * @param {string} outputPath - Ruta donde guardar la imagen generada
 */
export async function generateSlide(prompt, styleImagePath, outputPath, model = "gemini-3.1-flash-image-preview") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Carga la imagen de referencia de estilo
  const styleImageBytes = fs.readFileSync(styleImagePath);
  const styleImageBase64 = styleImageBytes.toString("base64");
  const styleMimeType = getMimeType(styleImagePath);

  const contents = [
    {
      inlineData: {
        mimeType: styleMimeType,
        data: styleImageBase64,
      },
    },
    `Use the visual style of this reference image (colors, mood, layout, aesthetic) to generate the following slide:\n\n${prompt}`,
  ];

  const response = await ai.models.generateContent({
    model: model,
    contents,
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

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] || "image/jpeg";
}
