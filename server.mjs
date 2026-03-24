import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCopy } from "./src/generateCopy.mjs";
import { buildPrompt } from "./src/buildPrompt.mjs";
import { generateSlide } from "./src/generateSlide.mjs";
import { generateInstagramCopy } from "./src/generateInstagramCopy.mjs";
import { analyzeStyle } from "./src/analyzeStyle.mjs";
import { uploadRef, downloadRefs } from "./src/cloudinaryStorage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// ─── Multer: subida de imágenes de referencia ────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "refs")),
  filename: (req, file, cb) => cb(null, file.fieldname + ".png"),
});
const upload = multer({ storage });

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/output", express.static(path.join(__dirname, "output")));
app.use("/refs", express.static(path.join(__dirname, "refs")));

// Cache de estilos analizados (se actualiza al subir nueva imagen)
const styleCache = { portada: null, interior: null };

// Al arrancar, descarga refs desde Cloudinary si no existen localmente, luego analiza estilos
async function preloadStyles() {
  const portadaPath  = path.join(__dirname, "refs/portada.png");
  const interiorPath = path.join(__dirname, "refs/interior.png");

  // Descargar desde Cloudinary si faltan localmente
  const faltaPortada  = !fs.existsSync(portadaPath);
  const faltaInterior = !fs.existsSync(interiorPath);
  if (faltaPortada || faltaInterior) {
    console.log("☁️  Descargando refs desde Cloudinary...");
    await downloadRefs(portadaPath, interiorPath).catch(() => null);
  }

  if (fs.existsSync(portadaPath))  styleCache.portada  = await analyzeStyle(portadaPath,  "portada").catch(() => null);
  if (fs.existsSync(interiorPath)) styleCache.interior = await analyzeStyle(interiorPath, "interior").catch(() => null);
  if (styleCache.portada)  console.log("✅ Estilo portada analizado");
  if (styleCache.interior) console.log("✅ Estilo interior analizado");
}

// ─── API: subir imágenes de referencia ──────────────────────────────────────

app.post("/api/refs", upload.fields([
  { name: "portada", maxCount: 1 },
  { name: "interior", maxCount: 1 },
]), async (req, res) => {
  // Subir a Cloudinary + analizar estilo de cada imagen subida
  if (req.files?.portada) {
    const localPath = path.join(__dirname, "refs/portada.png");
    await uploadRef(localPath, "portada").catch(() => null);
    console.log("🔍 Analizando estilo de portada...");
    styleCache.portada  = await analyzeStyle(localPath, "portada").catch(() => null);
    console.log("✅ Estilo portada actualizado");
  }
  if (req.files?.interior) {
    const localPath = path.join(__dirname, "refs/interior.png");
    await uploadRef(localPath, "interior").catch(() => null);
    console.log("🔍 Analizando estilo de interior...");
    styleCache.interior = await analyzeStyle(localPath, "interior").catch(() => null);
    console.log("✅ Estilo interior actualizado");
  }
  res.json({ ok: true });
});

// ─── API: obtener preview de refs actuales ───────────────────────────────────

app.get("/api/refs/status", (req, res) => {
  const portada  = fs.existsSync(path.join(__dirname, "refs/portada.png"));
  const interior = fs.existsSync(path.join(__dirname, "refs/interior.png"));
  res.json({ portada, interior });
});

// ─── API: parsear contenido libre en slides ──────────────────────────────────

app.post("/api/parse-slides", async (req, res) => {
  try {
    const { contenido, cantidadSlides } = req.body;
    if (!contenido) return res.status(400).json({ error: "Falta el contenido" });

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Sos un experto en carruseles de Instagram. El usuario te da el contenido de su carrusel en texto libre.
Tu tarea es estructurarlo en slides con el formato JSON indicado.

CONTENIDO DEL USUARIO:
${contenido}

LAYOUTS disponibles: "portada", "mito-verdad", "texto-imagen", "texto-dos-columnas", "texto-producto", "card-oscura", "antes-despues", "solo-tipografia"

Reglas:
- El primer slide siempre es tipo "portada" con layout "portada"
- El último slide es tipo "cta"
- Los del medio son tipo "contenido" — elegí el layout más apropiado según el contenido
- "titulo": máx 8 palabras, impactante
- "subtitulo": la idea clave del slide, máx 12 palabras
- "texto": desarrollo o dato concreto, máx 20 palabras (puede ser null)

Respondé ÚNICAMENTE con JSON válido sin markdown:
{
  "slides": [
    {
      "numero": 1,
      "tipo": "portada",
      "layout": "portada",
      "titulo": "...",
      "subtitulo": "...",
      "texto": null,
      "ctaTexto": "→"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = response.candidates[0].content.parts[0].text.trim()
      .replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: generar carrusel (SSE) ─────────────────────────────────────────────

app.get("/api/generate", async (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const config = JSON.parse(decodeURIComponent(req.query.config));

    // Validaciones básicas
    if (!process.env.GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY en el archivo .env");
    if (!fs.existsSync(path.join(__dirname, "refs/portada.png")))  throw new Error("Falta imagen de referencia de portada");
    if (!fs.existsSync(path.join(__dirname, "refs/interior.png"))) throw new Error("Falta imagen de referencia de interior");

    config.estiloPortada  = path.join(__dirname, "refs/portada.png");
    config.estiloInterior = path.join(__dirname, "refs/interior.png");
    config.modelo = config.modelo || "gemini-2.5-flash-image";

    send("log", { msg: `🍌 Iniciando generación: "${config.tema}"` });
    send("log", { msg: `📐 Modelo: ${config.modelo}` });

    // Crear carpeta de output
    const fecha = new Date().toISOString().slice(0, 10);
    const slug = config.tema.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
    const outputDir = path.join(__dirname, `output/carrusel-${slug}-${fecha}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // Paso 1: Copy
    let slides;
    if (config.slides && config.slides.length > 0) {
      slides = config.slides;
      send("log", { msg: `📋 Usando ${slides.length} slides predefinidos` });
    } else {
      send("log", { msg: "📝 Generando copy con Gemini..." });
      slides = await generateCopy(config);
      fs.writeFileSync(path.join(outputDir, "contenido.json"), JSON.stringify({ slides }, null, 2));
      send("log", { msg: `✅ Copy generado: ${slides.length} slides` });
    }

    send("total", { total: slides.length });

    // Paso 2: Imágenes
    send("log", { msg: "🎨 Generando imágenes con Nano Banana..." });

    const results = [];

    for (const slide of slides) {
      const slideNum = String(slide.numero).padStart(2, "0");
      const filename = `slide-${slideNum}.png`;
      const outputPath = path.join(outputDir, filename);
      const styleImage = slide.tipo === "portada" ? config.estiloPortada : config.estiloInterior;
      const estiloRef = slide.tipo === "portada" ? styleCache.portada : styleCache.interior;
      const prompt = buildPrompt(slide, config, estiloRef);

      send("log", { msg: `  🖼️  Slide ${slideNum} (${slide.tipo}): "${slide.titulo}"` });

      try {
        await generateSlide(prompt, styleImage, outputPath, config.modelo);
        const publicPath = `/output/carrusel-${slug}-${fecha}/${filename}`;
        send("slide", { slideNum, path: publicPath, titulo: slide.titulo });
        send("log", { msg: `     ✅ Listo` });
        results.push({ slide: slide.numero, path: outputPath, status: "ok" });
      } catch (err) {
        send("log", { msg: `     ❌ Error: ${err.message}` });
        results.push({ slide: slide.numero, status: "error", error: err.message });
      }

      await sleep(800);
    }

    // Paso 3: Caption Instagram
    send("log", { msg: "📱 Generando caption de Instagram..." });
    const caption = await generateInstagramCopy(slides, config);
    const captionPath = path.join(outputDir, "caption-instagram.txt");
    fs.writeFileSync(captionPath, caption, "utf-8");

    // Guardar resumen
    fs.writeFileSync(path.join(outputDir, "resumen.json"), JSON.stringify({ config, results }, null, 2));

    send("caption", { caption });
    send("done", { outputDir: `output/carrusel-${slug}-${fecha}` });

  } catch (err) {
    send("error", { msg: err.message });
  }

  res.end();
});

// ─── API: descargar ZIP con imágenes + caption ───────────────────────────────

app.get("/api/download", async (req, res) => {
  const { dir } = req.query;
  if (!dir) return res.status(400).send("Falta el directorio");

  const outputDir = path.join(__dirname, dir);
  if (!fs.existsSync(outputDir)) return res.status(404).send("Carpeta no encontrada");

  const { default: archiver } = await import("archiver");
  const folderName = path.basename(outputDir);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${folderName}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  // Agregar todos los PNG
  const pngs = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));
  for (const file of pngs) {
    archive.file(path.join(outputDir, file), { name: file });
  }

  // Agregar el caption TXT
  const captionFile = path.join(outputDir, "caption-instagram.txt");
  if (fs.existsSync(captionFile)) {
    archive.file(captionFile, { name: "caption-instagram.txt" });
  }

  await archive.finalize();
});

// ─── Start ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.listen(PORT, async () => {
  console.log(`\n🍌 Carousel Generator corriendo en: http://localhost:${PORT}\n`);
  import("child_process").then(({ exec }) => exec(`open http://localhost:${PORT}`));
  console.log(`(El puerto 3000 está ocupado por Remotion — usamos el 3001)\n`);
  await preloadStyles();
});
