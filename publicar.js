const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const publishBtn = document.getElementById('publishBtn');
const logoutBtn = document.getElementById('logoutBtn');
const productsList = document.getElementById('productsList');

let currentUser = null;

// 🔹 Verifica si hay usuario logueado
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    currentUser = user;
  }
});

// 🔹 Cerrar sesión
logoutBtn.onclick = () => auth.signOut().then(() => window.location.href = 'index.html');

// 🔹 Publicar producto
publishBtn.onclick = async () => {
  const name = document.getElementById('productName').value.trim();
  const qty = document.getElementById('productQty').value.trim();
  const desired = document.getElementById('desired').value.trim();
  const desiredQty = document.getElementById('desiredQty').value.trim();
  const file = document.getElementById('productImage').files[0];

  if (!name || !qty || !desired || !desiredQty || !file) {
    return alert('Completa todos los campos');
  }

  try {
    const filePath = `products/${currentUser.uid}/${Date.now()}_${file.name}`;
    const uploadSnap = await storage.ref(filePath).put(file);
    const imageUrl = await uploadSnap.ref.getDownloadURL();

    await db.collection('products').add({
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email,
      name, qty, desired, desiredQty,
      imageUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('✅ Producto publicado');
    loadProducts();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

// 🔹 Cargar productos
function loadProducts() {
  db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    productsList.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      productsList.innerHTML += `
        <div class="border p-2 mb-2">
          <img src="${p.imageUrl}" width="100"><br>
          <strong>${p.name}</strong> (${p.qty})<br>
          Quiere: ${p.desired} (${p.desiredQty})<br>
          <small>Publicado por: ${p.ownerEmail}</small>
        </div>
      `;
    });
  });
}
loadProducts();
