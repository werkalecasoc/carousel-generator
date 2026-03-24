import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import https from "https";

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
  await cloudinary.uploader.upload(localPath, {
    public_id:     `carousel-refs/${type}`,
    overwrite:     true,
    resource_type: "image",
    format:        "png",
  });
  console.log(`☁️  Ref "${type}" guardada en Cloudinary`);
}

/** Descarga las refs desde Cloudinary al disco local (si existen) */
export async function downloadRefs(portadaPath, interiorPath) {
  if (!configure()) return;
  await Promise.all([
    downloadIfExists("carousel-refs/portada",  portadaPath),
    downloadIfExists("carousel-refs/interior", interiorPath),
  ]);
}

async function downloadIfExists(publicId, destPath) {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "image" });
    await downloadFile(result.secure_url, destPath);
    console.log(`⬇️  Descargada ref "${publicId}" desde Cloudinary`);
  } catch {
    // No existe todavía en Cloudinary, se saltea
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}
