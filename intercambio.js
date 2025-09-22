const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const userInfo = document.getElementById('userInfo');
const productNameEl = document.getElementById('productName');
const productQtyEl = document.getElementById('productQty');
const desiredEl = document.getElementById('desired');
const desiredQtyEl = document.getElementById('desiredQty');
const productImageEl = document.getElementById('productImage');
const publishBtn = document.getElementById('publishBtn');
const productsList = document.getElementById('productsList');

let currentUser = null;

// -------------------- Autenticación --------------------
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  userInfo.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <span><i class="fa-solid fa-user"></i> ${user.displayName || user.email}</span>
      <button id="logoutBtn" class="btn btn-sm btn-outline-light">Cerrar sesión</button>
    </div>
  `;

  document.getElementById('logoutBtn').onclick = () => {
    auth.signOut().then(() => window.location.href = "index.html");
  };

  loadProducts();
});

// -------------------- Publicar producto --------------------
publishBtn.onclick = async () => {
  const name = productNameEl.value.trim();
  const qty = productQtyEl.value.trim();
  const desired = desiredEl.value.trim();
  const desiredQty = desiredQtyEl.value.trim();
  const file = productImageEl.files[0];

  if (!name || !qty || !desired || !desiredQty || !file) {
    return alert("⚠️ Completa todos los campos y selecciona una imagen.");
  }

  try {
    publishBtn.disabled = true;
    publishBtn.textContent = "Publicando...";

    // Subir imagen
    const filePath = `products/${currentUser.uid}/${Date.now()}_${file.name}`;
    const uploadSnap = await storage.ref(filePath).put(file);
    const imageUrl = await uploadSnap.ref.getDownloadURL();

    // Guardar en Firestore
    await db.collection("products").add({
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email,
      ownerName: currentUser.displayName || currentUser.email,
      name,
      qty,
      desired,
      desiredQty,
      imageUrl,
      imagePath: filePath,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Limpiar formulario
    productNameEl.value = "";
    productQtyEl.value = "";
    desiredEl.value = "";
    desiredQtyEl.value = "";
    productImageEl.value = "";
    alert("✅ Producto publicado correctamente");

  } catch (err) {
    alert("❌ Error al publicar: " + err.message);
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "Publicar";
  }
};

// -------------------- Cargar productos --------------------
function loadProducts() {
  db.collection("products").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    productsList.innerHTML = "";

    if (snapshot.empty) {
      productsList.innerHTML = "<p class='text-muted'>No hay productos publicados aún.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const productEl = document.createElement("div");
      productEl.className = "product-item";

      productEl.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.name}">
        <div style="flex:1">
          <strong>${data.name}</strong> <small>(${data.qty})</small><br>
          <small>Ofrece: ${data.ownerName}</small><br>
          <small>Quiere: ${data.desired} — ${data.desiredQty}</small><br>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-primary contactBtn">Contactar</button>
            ${currentUser.uid === data.ownerUid ? '<button class="btn btn-sm btn-outline-danger ms-2 deleteBtn">Eliminar</button>' : ''}
          </div>
        </div>
      `;

      // Contactar
      productEl.querySelector(".contactBtn").onclick = () => {
        const subject = encodeURIComponent(`Intercambio: ${data.name}`);
        const body = encodeURIComponent(`Hola ${data.ownerName},\n\nEstoy interesado/a en tu producto "${data.name}".`);
        window.location.href = `mailto:${data.ownerEmail}?subject=${subject}&body=${body}`;
      };

      // Eliminar si es dueño
      if (currentUser.uid === data.ownerUid) {
        productEl.querySelector(".deleteBtn").onclick = async () => {
          if (confirm("¿Eliminar este producto?")) {
            try {
              await storage.ref(data.imagePath).delete();
              await db.collection("products").doc(doc.id).delete();
              alert("✅ Producto eliminado");
            } catch (err) {
              alert("❌ Error al eliminar: " + err.message);
            }
          }
        };
      }

      productsList.appendChild(productEl);
    });
  });
}
