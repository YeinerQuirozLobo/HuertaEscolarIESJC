const displayNameEl = document.getElementById('displayName');
const productNameEl = document.getElementById('productName');
const productQtyEl = document.getElementById('productQty');
const desiredEl = document.getElementById('desired');
const desiredQtyEl = document.getElementById('desiredQty');
const productImageEl = document.getElementById('productImage');
const publishBtn = document.getElementById('publishBtn');
const productsList = document.getElementById('productsList');

// Reemplaza esto con tu URL de Cloudinary
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dwy1szkvn/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'haz6ctpg';

// Publicar producto
publishBtn.onclick = async () => {
  const ownerName = displayNameEl.value.trim();
  const name = productNameEl.value.trim();
  const qty = productQtyEl.value.trim();
  const desired = desiredEl.value.trim();
  const desiredQty = desiredQtyEl.value.trim();
  const file = productImageEl.files[0];

  if (!ownerName || !name || !qty || !desired || !desiredQty || !file) {
    return alert('⚠️ Completa todos los campos y selecciona una imagen.');
  }

  try {
    publishBtn.disabled = true;
    publishBtn.innerText = 'Publicando...';

    // Subir imagen a Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    const imageUrl = data.secure_url;

   // Subir imagen a Cloudinary
const formData = new FormData();
formData.append('file', file);
formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
const data = await res.json();
const imageUrl = data.secure_url;

// Guardar en Firestore
await db.collection('products').add({
  ownerName,
  name,
  qty,
  desired,
  desiredQty,
  imageUrl,
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

