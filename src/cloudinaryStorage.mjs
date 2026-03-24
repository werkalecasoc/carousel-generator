import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

function configure() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return true;
}

/** Sube una imagen de referencia a Cloudinary (sobreescribe si ya existe) */
export async function uploadRef(localPath, type) {
  if (!configure()) return;
  const result = await cloudinary.uploader.upload(localPath, {
    public_id:     `carousel-refs/${type}`,
    overwrite:     true,
    invalidate:    true,
    resource_type: "image",
    format:        "png",
  });
  console.log(`☁️  Ref "${type}" guardada en Cloudinary: ${result.secure_url}`);
  return result;
}

/** Descarga las refs desde Cloudinary al disco local */
export async function downloadRefs(portadaPath, interiorPath) {
  if (!configure()) {
    console.warn("⚠️  Cloudinary no configurado — se usan refs locales");
    return;
  }
  await Promise.all([
    downloadIfExists("carousel-refs/portada",  portadaPath),
    downloadIfExists("carousel-refs/interior", interiorPath),
  ]);
}

async function downloadIfExists(publicId, destPath) {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "image" });
    const url = result.secure_url;
    console.log(`⬇️  Descargando "${publicId}" desde: ${url}`);
    await downloadFile(url, destPath);
    const size = fs.statSync(destPath).size;
    console.log(`✅ "${publicId}" guardada en disco (${size} bytes)`);
  } catch (err) {
    console.error(`❌ Error descargando "${publicId}": ${err.message}`);
  }
}

/** Usa fetch nativo (Node 18+) que maneja redirects automáticamente */
async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}
