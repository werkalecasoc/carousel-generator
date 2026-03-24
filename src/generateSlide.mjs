import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

/**
 * Genera una imagen para un slide.
 * La imagen de referencia se pasa como GUÍA DE ESTILO ÚNICAMENTE —
 * el modelo extrae paleta, mood, composición, tipografía visual, etc.
 * pero crea una imagen completamente nueva, sin copiar el contenido original.
 */
export async function generateSlide(prompt, styleImagePath, outputPath, model = "gemini-3.1-flash-image-preview") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const styleImageBytes  = fs.readFileSync(styleImagePath);
  const styleImageBase64 = styleImageBytes.toString("base64");
  const styleMimeType    = getMimeType(styleImagePath);

  const styleInstruction = `STYLE REFERENCE IMAGE — read carefully before generating.

This image is provided as a VISUAL STYLE GUIDE ONLY.
DO NOT copy, reproduce, or reuse any of the following from this image:
- Specific objects, products, or subjects shown
- People, faces, or bodies
- Any text, logos, or brand elements
- The exact composition or scene

ONLY extract and apply these style attributes:
- Color treatment (warm/cool, saturated/muted, contrast level)
- Background style (flat, gradient, textured, photographic)
- Typography treatment (bold/light mix, shadow, outline, sizing hierarchy)
- Lighting mood (bright/dark, soft/harsh, studio/natural)
- Decorative elements style (geometric shapes, lines, pills, overlays)
- Overall aesthetic (editorial, minimal, playful, corporate, premium)

Now CREATE A COMPLETELY ORIGINAL image using those style attributes, following these instructions:

${prompt}`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { inlineData: { mimeType: styleMimeType, data: styleImageBase64 } },
      styleInstruction,
    ],
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
  return { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";
}
