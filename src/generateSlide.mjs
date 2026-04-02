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

  const styleInstruction = `⚠️ VISUAL MOOD BOARD — READ THIS BEFORE GENERATING ANYTHING.

This image is a STYLE REFERENCE ONLY — a mood board to extract aesthetic language.
You MUST NOT copy, reproduce, reuse, or derive ANY visual element from this image.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICTLY FORBIDDEN — do NOT reproduce from this reference:
• Any object, product, subject, or scene shown in this image
• Any person, face, body, or silhouette — even in a stylized or abstract form
• Any text, logo, icon, or typographic element visible in this image
• The exact color palette, background, or composition of this image
• Any graphic element, illustration, shape, or decorative detail from this image
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU MUST DO INSTEAD:
Look at this image and extract ONLY its visual DNA — the aesthetic language:
• Is it a photo? → Generate a BRAND NEW photo in the same photographic style (same lighting mood, same editorial treatment, same color grading — but a completely different subject and scene)
• Is it an illustration or drawing? → Generate a BRAND NEW illustration with the same drawing style, line weight, and graphic language — but with entirely new content
• Is it 3D render? → Generate a new 3D render in the same render style — different scene
• Background treatment (flat color, gradient, textured, blurred photo, etc.)
• Typography visual mood (bold/light hierarchy, shadows, outlines, sizing)
• Lighting and shadows (soft studio, harsh dramatic, natural, etc.)
• Decorative elements style (geometric, organic, minimal, ornate)
• Overall aesthetic mood (editorial, corporate, playful, premium, raw)

The result MUST be a 100% original creation that has NEVER existed before.
It should feel visually coherent with the reference style — but share ZERO actual content.

Now generate a completely original image following these specifications:

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
