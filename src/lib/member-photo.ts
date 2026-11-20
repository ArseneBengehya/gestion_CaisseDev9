const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_STORED_SIZE = 700 * 1024;
const MAX_DIMENSION = 1024;

const readDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire la photo sélectionnée."));
    reader.readAsDataURL(file);
  });

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("La photo sélectionnée est illisible."));
    };
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Impossible de préparer la photo.")),
      type,
      quality
    );
  });

// Convertit et redimensionne une image avant de la stocker dans Firestore en Base64.
export const uploadMemberPhoto = async (file: File, _membreId: string): Promise<string> => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Format non accepté. Choisissez une image JPG, PNG ou WEBP.");
  }
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error("La photo est trop volumineuse. La taille maximale est de 10 Mo.");
  }

  const image = await loadImage(file);
  let maxDimension = MAX_DIMENSION;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Votre navigateur ne peut pas traiter cette photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/webp", 0.82);
    const dataUrl = await readDataUrl(blob);
    if (dataUrl.length <= MAX_STORED_SIZE) return dataUrl;
    maxDimension = attempt === 0 ? 768 : 512;
  }

  throw new Error("La photo reste trop volumineuse après compression. Essayez une image plus petite.");
};