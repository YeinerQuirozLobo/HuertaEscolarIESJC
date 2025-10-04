import { supabase } from "./supabaseClient.js";

// Referencias
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Modal chat
const chatModal = new bootstrap.Modal(document.getElementById("chatModal"));
const mensajesModal = document.getElementById("mensajesModal");
const inputMensajeModal = document.getElementById("inputMensajeModal");
const enviarMensajeModalBtn = document.getElementById("enviarMensajeModalBtn");

let currentUserId = null;
let chatIntercambioId = null;

// Sesión actual
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error obteniendo sesión:", error.message);
    return;
  }
  if (!session) {
    console.warn("⚠️ No hay sesión activa.");
    return;
  }
  console.log("Sesión activa:", session);
  currentUserId = session.user.id;
  console.log("Usuario autenticado ID:", currentUserId);
  cargarPublicaciones();
});

// Cerrar sesión
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// Crear publicación
formPublicacion.addEventListener("submit", async (e) => {
  e.preventDefault();
  const producto = document.getElementById("producto").value;
  const cantidad = document.getElementById("cantidad").value;
  const unidad = document.getElementById("unidad").value;
  const productoDeseado = document.getElementById("productoDeseado").value;
  const cantidadDeseada = document.getElementById("cantidadDeseada").value;
  const unidadDeseada = document.getElementById("unidadDeseada").value;

  const imagenFile = document.getElementById("imagen").files[0];
  let imagenUrl = null;

  if (imagenFile) {
    const filePath = `${Date.now()}_${imagenFile.name}`;
    const { error: uploadError } = await supabase.storage.from("productos").upload(filePath, imagenFile);
    if (uploadError) {
      console.error("Error subiendo imagen:", uploadError.message);
      return;
    }
    const { data: publicUrl } = supabase.storage.from("productos").getPublicUrl(filePath);
    imagenUrl = publicUrl.publicUrl;
  }

  const { error } = await supabase.from("publicaciones").insert([{
    usuario_id: currentUserId,
    producto,
    cantidad,
    unidad,
    imagen_url: imagenUrl,
    producto_deseado: productoDeseado,
    cantidad_deseada: cantidadDeseada,
    unidad_deseada: unidadDeseada
  }]);

  if (error) {
    console.error("Error creando publicación:", error.message);
  } else {
    formPublicacion.reset();
    cargarPublicaciones();
  }
});

// Cargar publicaciones
async function cargarPublicaciones() {
  const { data, error } = await supabase.from("publicaciones").select(`*, usuario:usuario_id (email)`).order("id", { ascending: false });
  if (error) {
    console.error("Error cargando publicaciones:", error.message);
    return;
  }

  feedContainer.innerHTML = "";
  data.forEach(pub => {
    const card = document.createElement("div");
    card.className = "card shadow mb-3";
    card.innerHTML = `
      <div class="card-body">
        <h5>${pub.producto} (${pub.cantidad} ${pub.unidad})</h5>
        <p><b>Desea a cambio:</b> ${pub.producto_deseado} (${pub.cantidad_deseada} ${pub.unidad_deseada})</p>
        ${pub.imagen_url ? `<img src="${pub.imagen_url}" class="img-fluid rounded mb-2" style="max-height:200px;">` : ""}
        <p><small>Publicado por: ${pub.usuario?.email || "Anónimo"}</small></p>
        <button class="btn btn-primary btn-sm">Pedir Intercambio</button>
      </div>
    `;
    feedContainer.appendChild(card);
  });
}

// -----------------------------
// CHAT DEL INTERCAMBIO
// -----------------------------
async function abrirChat(intercambioId) {
  chatIntercambioId = intercambioId;
  mensajesModal.innerHTML = "";
  inputMensajeModal.value = "";

  // Cargar mensajes existentes
  const { data: mensajes, error } = await supabase.from("mensajes")
    .select(`*, usuario:usuario_id (email)`)
    .eq("intercambio_id", intercambioId)
    .order("created_at", { ascending: true });

  if (!error && mensajes) {
    mensajes.forEach(m => {
      const p = document.createElement("p");
      p.innerHTML = `<b>${m.usuario?.email || "Usuario"}:</b> ${m.contenido}`;
      mensajesModal.appendChild(p);
    });
    mensajesModal.scrollTop = mensajesModal.scrollHeight;
  }

  chatModal.show();
}

// Enviar mensaje
enviarMensajeModalBtn.addEventListener("click", async () => {
  if (!chatIntercambioId) return;
  const contenido = inputMensajeModal.value.trim();
  if (!contenido) return;

  const { error } = await supabase.from("mensajes").insert([{
    intercambio_id: chatIntercambioId,
    usuario_id: currentUserId,
    contenido
  }]);

  if (!error) {
    const p = document.createElement("p");
    p.innerHTML = `<b>Tú:</b> ${contenido}`;
    mensajesModal.appendChild(p);
    inputMensajeModal.value = "";
    mensajesModal.scrollTop = mensajesModal.scrollHeight;
  } else {
    console.error("Error enviando mensaje:", error.message);
  }
});
