import { supabase } from "./supabaseClient.js";

// ----------- PUBLICAR PRODUCTO -----------
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const product = document.getElementById("productName").value;
  const productQuantity = document.getElementById("productQuantity").value;
  const productUnit = document.getElementById("productUnit").value;
  const exchangeProduct = document.getElementById("exchangeProduct").value;
  const exchangeQuantity = document.getElementById("exchangeQuantity").value;
  const exchangeUnit = document.getElementById("exchangeUnit").value;
  const fileInput = document.getElementById("productImage");

  if (!fileInput.files.length) {
    alert("Debes subir una imagen");
    return;
  }

  const file = fileInput.files[0];
  const fileName = `${Date.now()}-${file.name}`;

  // 🔹 Subir archivo al bucket "productos"
  const { error: uploadError } = await supabase.storage
    .from("productos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.error("Error al subir la imagen:", uploadError.message);
    alert("❌ Error al subir la imagen");
    return;
  }

  // 🔹 Obtener URL pública
  const { data: urlData } = supabase.storage
    .from("productos")
    .getPublicUrl(fileName);

  const imageUrl = urlData.publicUrl;

  // 🔹 Guardar publicación en la tabla "publicaciones"
  const { error: insertError } = await supabase.from("publicaciones").insert([
    {
      producto: product,
      cantidad: productQuantity + " " + productUnit,
      imagen_url: imageUrl,
      desea_producto: exchangeProduct,
      desea_cantidad: exchangeQuantity + " " + exchangeUnit,
    },
  ]);

  if (insertError) {
    console.error("Error al guardar en la base de datos:", insertError.message);
    alert("❌ Error al guardar la publicación");
  } else {
    alert("✅ Publicación creada con éxito");
    document.getElementById("productForm").reset();
    loadFeed(); // recargar publicaciones
  }
});

// ----------- MOSTRAR FEED DE PUBLICACIONES -----------
async function loadFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "<p>Cargando publicaciones...</p>";

  const { data, error } = await supabase
    .from("publicaciones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar publicaciones:", error.message);
    feed.innerHTML = "<p>Error al cargar publicaciones</p>";
    return;
  }

  if (!data.length) {
    feed.innerHTML = "<p>No hay publicaciones todavía</p>";
    return;
  }

  feed.innerHTML = data
    .map(
      (pub) => `
      <div class="card mb-3 shadow-sm">
        <img src="${pub.imagen_url}" class="card-img-top" alt="${pub.producto}">
        <div class="card-body">
          <h5 class="card-title">${pub.producto}</h5>
          <p><strong>Cantidad:</strong> ${pub.cantidad}</p>
          <p><strong>Desea recibir:</strong> ${pub.desea_producto} (${pub.desea_cantidad})</p>
        </div>
      </div>
    `
    )
    .join("");
}

// ----------- CERRAR SESIÓN -----------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ----------- CARGAR AL INICIAR -----------
loadFeed();
