import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCopy } from "./generateCopy.mjs";
import { buildPrompt } from "./buildPrompt.mjs";
import { generateSlide } from "./generateSlide.mjs";
import { generateInstagramCopy } from "./generateInstagramCopy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Leer config ────────────────────────────────────────────────────────────

function loadConfig() {
  const args = process.argv.slice(2);
  const configFlag = args.indexOf("--config");

  let configPath;
  if (configFlag !== -1 && args[configFlag + 1]) {
    configPath = path.resolve(args[configFlag + 1]);
  } else {
    configPath = path.resolve(__dirname, "../config/ejemplo.json");
  }

  if (!fs.existsSync(configPath)) {
    console.error(`❌ No se encontró el archivo de config: ${configPath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

// ─── Validar config ──────────────────────────────────────────────────────────

function validateConfig(config) {
  const required = ["tema", "cantidadSlides", "tono", "audiencia", "estiloPortada", "estiloInterior", "tipografiaTitulos", "tipografiaSubtitulos", "paleta"];
  const missing = required.filter((k) => !config[k]);

  if (missing.length > 0) {
    console.error(`❌ Faltan campos en el config: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (!fs.existsSync(config.estiloPortada)) {
    console.error(`❌ No se encontró la imagen de portada: ${config.estiloPortada}`);
    process.exit(1);
  }

  if (!fs.existsSync(config.estiloInterior)) {
    console.error(`❌ No se encontró la imagen de interior: ${config.estiloInterior}`);
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Falta la variable de entorno GEMINI_API_KEY");
    process.exit(1);
  }
}

// ─── Crear carpeta de output ─────────────────────────────────────────────────

function createOutputDir(tema) {
  const fecha = new Date().toISOString().slice(0, 10);
  const slug = tema.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const outputDir = path.resolve(__dirname, `../output/carrusel-${slug}-${fecha}`);
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🍌 Carousel Generator — Nano Banana\n");

  const config = loadConfig();
  validateConfig(config);

  const modelo = config.modelo || "gemini-3.1-flash-image-preview";

  console.log(`📋 Config cargado:`);
  console.log(`   Tema:      ${config.tema}`);
  console.log(`   Slides:    ${config.cantidadSlides}`);
  console.log(`   Tono:      ${config.tono}`);
  console.log(`   Audiencia: ${config.audiencia}`);
  console.log(`   Modelo:    ${modelo}\n`);

  const outputDir = createOutputDir(config.tema);
  console.log(`📁 Output: ${outputDir}\n`);

  // Paso 1: Generar copy de slides (o usar predefinidos del config)
  let slides;
  if (config.slides && config.slides.length > 0) {
    slides = config.slides;
    console.log(`📋 Usando ${slides.length} slides predefinidos del config\n`);
  } else {
    slides = await generateCopy(config);
    const copyPath = path.join(outputDir, "contenido.json");
    fs.writeFileSync(copyPath, JSON.stringify({ slides }, null, 2));
    console.log(`💾 Copy guardado en: ${copyPath}\n`);
  }

  // Paso 2: Generar imágenes con Nano Banana
  console.log("🎨 Generando imágenes con Nano Banana...\n");

  const results = [];

  for (const slide of slides) {
    const slideNum = String(slide.numero).padStart(2, "0");
    const outputPath = path.join(outputDir, `slide-${slideNum}.png`);
    const styleImage = slide.tipo === "portada" ? config.estiloPortada : config.estiloInterior;
    const prompt = buildPrompt(slide, config);

    console.log(`  🖼️  Slide ${slideNum} (${slide.tipo}): "${slide.titulo}"`);

    try {
      await generateSlide(prompt, styleImage, outputPath, modelo);
      console.log(`     ✅ Guardado: ${path.basename(outputPath)}`);
      results.push({ slide: slide.numero, tipo: slide.tipo, path: outputPath, status: "ok" });
    } catch (err) {
      console.error(`     ❌ Error en slide ${slideNum}: ${err.message}`);
      results.push({ slide: slide.numero, tipo: slide.tipo, path: outputPath, status: "error", error: err.message });
    }

    await sleep(1000);
  }

  // Paso 3: Generar caption de Instagram
  console.log("");
  const caption = await generateInstagramCopy(slides, config);

  // Guardar caption en archivo de texto
  const captionPath = path.join(outputDir, "caption-instagram.txt");
  fs.writeFileSync(captionPath, caption, "utf-8");

  // Resumen final
  const slidesOk = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error");

  console.log("\n─────────────────────────────────────────");
  console.log("✅ Carrusel listo!");
  console.log(`📁 Carpeta: ${outputDir}`);
  console.log(`🖼️  Slides:  ${slidesOk}/${slides.length} generados`);
  console.log(`📐 Formato: 4:5 portrait (1080x1350px)`);

  if (errors.length > 0) {
    console.log(`⚠️  Errores: ${errors.length} slide(s) fallaron`);
    errors.forEach((e) => console.log(`   - Slide ${e.slide}: ${e.error}`));
  }

  console.log("\n📱 CAPTION DE INSTAGRAM:");
  console.log("─────────────────────────────────────────");
  console.log(caption);
  console.log("─────────────────────────────────────────");
  console.log(`💾 Caption guardado en: caption-instagram.txt`);

  // Guardar resumen
  const summaryPath = path.join(outputDir, "resumen.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ config, results }, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
