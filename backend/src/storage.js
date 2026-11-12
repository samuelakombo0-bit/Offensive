const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");

class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
  }
}

// Les originaux ne sont jamais publiés : les images autorisées sont réencodées en WebP.
async function savePrivateImage(buffer, directory) {
  const image = sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000 });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new ImageValidationError("Le fichier ne peut pas être traité comme une image.");
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ImageValidationError("Formats autorisés : JPEG, PNG et WebP.");
  }

  await fs.mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  let encodedImage;
  try {
    encodedImage = await image.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw new ImageValidationError("L’image est endommagée ou ne peut pas être convertie.");
  }
  await fs.writeFile(path.join(directory, filename), encodedImage, { flag: "wx" });
  return filename;
}

// Un nom généré par le serveur empêche les chemins fournis par un visiteur d'accéder au disque.
function resolvePrivateImage(directory, filename) {
  if (typeof filename !== "string" || !/^[0-9a-f-]{36}\.webp$/.test(filename)) return null;
  const resolved = path.resolve(directory, filename);
  return path.dirname(resolved) === path.resolve(directory) ? resolved : null;
}

// Les suppressions de fichiers tolèrent uniquement le cas où le fichier est déjà absent.
async function removePrivateImage(directory, filename) {
  const target = resolvePrivateImage(directory, filename);
  if (!target) return;
  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = { ImageValidationError, savePrivateImage, resolvePrivateImage, removePrivateImage };
