// cloudinary-config.js
const CLOUD_NAME = "b060bde9-7e99-47e9-a88f-f1956a197723"; //
const UPLOAD_PRESET = "haz6ctpg"; //

// Función para subir imágenes a Cloudinary
async function uploadImage(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url; // URL pública de la imagen
}
