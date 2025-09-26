// js/dashboard.js
import { supabase } from "./supabaseClient.js";

// 🚀 Verificar sesión al cargar
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "index.html"; // redirige si no hay sesión
    return;
  }

  const user = session.user;
  console.log("Usuario autenticado ID:", user.id);

  await cargarPublicaciones(user);
});

// =======================
// 📌 Cargar publicaciones
// =======================
async function cargarPublicaciones(user) {
  try {
    const { data: publicaciones, error } = await supabase
      .from("publicaciones")
      .select(`
        id,
        producto,
        cantidad,
        unidad,
        unidad_deseada,
        producto_deseado,
        cantidad_deseada,
        imagen_url,
        create_at,
        user_id,
        profiles ( full_name )
      `)
      .order("create_at", { ascending: false });

    if (error) throw error;

    const contenedor = document.getElementById("publicaciones-list");
    contenedor.innerHTML = "";

    publicaciones.forEach((pub) => {
      const div = document.createElement("div");
      div.classList.add("publicacion");

      div.innerHTML = `
        <h3>${pub.producto} (${pub.cantidad} ${pub.unidad})</h3>
        <p><strong>Desea:</strong> ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${pub.producto_deseado}</p>
        <p><em>Publicado por:</em> ${pub.profiles?.full_name || "Anónimo"}</p>
        ${pub.imagen_url ? `<img src="${pub.imagen_url}" alt="Imagen" width="200">` : ""}
        <button onclick="solicitarIntercambio(${pub.id})">🤝 Solicitar intercambio</button>
        <button onclick="toggleComentarios(${pub.id})" id="btn-com-${pub.id}">💬 Ver comentarios</button>
        ${pub.user_id === user.id ? `<button onclick="eliminarPublicacion(${pub.id})">🗑 Eliminar</button>` : ""}
        <div id="comentarios-${pub.id}" class="comentarios" style="display:none;">
          <div id="lista-com-${pub.id}">Cargando comentarios...</div>
          <form onsubmit="return enviarComentario(event, ${pub.id})">
            <input type="text" id="input-com-${pub.id}" placeholder="Escribe un comentario" required>
            <button type="submit">Enviar</button>
          </form>
        </div>
      `;

      contenedor.appendChild(div);
    });

  } catch (err) {
    console.error("❌ Error al cargar publicaciones:", err.message);
  }
}

// =======================
// 📌 Ver/Ocultar comentarios
// =======================
window.toggleComentarios = async function (publicacionId) {
  const seccion = document.getElementById(`comentarios-${publicacionId}`);
  const btn = document.getElementById(`btn-com-${publicacionId}`);

  if (seccion.style.display === "none") {
    seccion.style.display = "block";
    btn.textContent = "🙈 Ocultar comentarios";
    await cargarComentarios(publicacionId);
  } else {
    seccion.style.display = "none";
    btn.textContent = "💬 Ver comentarios";
  }
};

// =======================
// 📌 Cargar comentarios
// =======================
async function cargarComentarios(publicacionId) {
  try {
    const { data: comentarios, error } = await supabase
      .from("comentarios")
      .select(`
        id,
        mensaje,
        create_at,
        user_id,
        profiles!comentarios_user_id_fkey ( full_name )
      `)
      .eq("publicacion_id", publicacionId)
      .order("create_at", { ascending: true });

    if (error) throw error;

    const contenedor = document.getElementById(`lista-com-${publicacionId}`);
    contenedor.innerHTML = "";

    if (!comentarios || comentarios.length === 0) {
      contenedor.innerHTML = "<p><em>Sin comentarios</em></p>";
      return;
    }

    comentarios.forEach((com) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${com.profiles?.full_name || "Anónimo"}:</strong> ${com.mensaje}`;
      contenedor.appendChild(p);
    });

  } catch (err) {
    console.error("❌ Error al cargar comentarios:", err.message);
    document.getElementById(`lista-com-${publicacionId}`).innerHTML = "<p>Error al cargar comentarios</p>";
  }
}

// =======================
// 📌 Enviar comentario
// =======================
window.enviarComentario = async function (e, publicacionId) {
  e.preventDefault();
  const input = document.getElementById(`input-com-${publicacionId}`);
  const mensaje = input.value.trim();
  if (!mensaje) return false;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session.user;

  try {
    const { error } = await supabase.from("comentarios").insert([
      {
        publicacion_id: publicacionId,
        user_id: user.id,
        mensaje
      }
    ]);
    if (error) throw error;

    input.value = "";
    await cargarComentarios(publicacionId);
  } catch (err) {
    console.error("❌ Error al enviar comentario:", err.message);
  }
  return false;
};

// =======================
// 📌 Solicitar intercambio
// =======================
window.solicitarIntercambio = async function (publicacionId) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session.user;

  try {
    const { error } = await supabase.from("intercambios").insert([
      {
        publicacion_id: publicacionId,
        user_id: user.id,
        mensaje: "Quiero intercambiar este producto",
        estado: "pendiente"
      }
    ]);
    if (error) throw error;
    alert("✅ Solicitud de intercambio enviada");
  } catch (err) {
    console.error("❌ Error al solicitar intercambio:", err.message);
  }
};

// =======================
// 📌 Eliminar publicación
// =======================
window.eliminarPublicacion = async function (publicacionId) {
  if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;

  try {
    const { error } = await supabase.from("publicaciones").delete().eq("id", publicacionId);
    if (error) throw error;

    alert("✅ Publicación eliminada");
    location.reload();
  } catch (err) {
    console.error("❌ Error al eliminar publicación:", err.message);
  }
};
