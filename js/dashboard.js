import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔑 Conexión a Supabase
const SUPABASE_URL = "https://mhjfofucyvlesahsekzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oamZvZnVjeXZsZXNhaHNla3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzM2NjMsImV4cCI6MjA3NDE0OTY2M30.wDV6wH5pfqSzs6FSkArucqIWS2Q5_PvyczNLQ0_mJZk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 📌 Referencias a elementos
const publicacionForm = document.getElementById("publicacionForm");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logout");

// 👉 Función para subir imagen a Supabase Storage
async function subirImagen(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from("productos")
    .upload(fileName, file);

  if (error) {
    console.error("❌ Error al subir imagen:", error.message);
    return null;
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from("productos")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// 👉 Manejo del formulario de publicación
publicacionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const producto = document.getElementById("producto").value;
  const cantidad = document.getElementById("cantidad").value;
  const unidad = document.getElementById("unidad").value;
  const imagen = document.getElementById("imagen").files[0];
  const deseoProducto = document.getElementById("deseoProducto").value;
  const deseoCantidad = document.getElementById("deseoCantidad").value;
  const deseoUnidad = document.getElementById("deseoUnidad").value;

  if (!imagen) {
    alert("Por favor sube una imagen del producto");
    return;
  }

  // Subir imagen
  const imagenUrl = await subirImagen(imagen);

  if (!imagenUrl) {
    alert("Error al subir la imagen");
    return;
  }

  // Guardar en Supabase
  const { error } = await supabase.from("publicaciones").insert([
    {
      producto,
      cantidad,
      unidad,
      imagen: imagenUrl,
      deseo_producto: deseoProducto,
      deseo_cantidad: deseoCantidad,
      deseo_unidad: deseoUnidad,
    },
  ]);

  if (error) {
    console.error("❌ Error al guardar publicación:", error.message);
    alert("No se pudo publicar");
  } else {
    alert("✅ Publicación creada con éxito");
    publicacionForm.reset();
    cargarPublicaciones();
  }
});

// 👉 Función para cargar publicaciones en el feed
async function cargarPublicaciones() {
  const { data, error } = await supabase
    .from("publicaciones")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("❌ Error al cargar publicaciones:", error.message);
    return;
  }

  feedContainer.innerHTML = "";

  data.forEach((pub) => {
    const div = document.createElement("div");
    div.classList.add("publicacion");
    div.innerHTML = `
      <p><strong>Producto:</strong> ${pub.producto}</p>
      <p><strong>Cantidad:</strong> ${pub.cantidad} ${pub.unidad}</p>
      <img src="${pub.imagen}" alt="${pub.producto}">
      <p><strong>Quiere recibir:</strong> ${pub.deseo_cantidad} ${pub.deseo_unidad} de ${pub.deseo_producto}</p>
    `;
    feedContainer.appendChild(div);
  });
}

// 👉 Cerrar sesión
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// 🚀 Cargar publicaciones al iniciar
cargarPublicaciones();
