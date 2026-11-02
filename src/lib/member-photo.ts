// Convertit un fichier image en chaîne Base64 (contourne Firebase Storage et les problèmes de CORS)
export const uploadMemberPhoto = async (file: File, membreId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};