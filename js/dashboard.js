// js/dashboard.js
import { supabase } from "./supabaseClient.js";

// Verificar si el usuario está autenticado
supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) {
    window.location.href = "login.html"; // Redirigir si no hay usuario
  } else {
    console.log("Usuario autenticado ID:", user.id);
    cargarPublicaciones();
  }
});

// Función para cargar publicaciones con el perfil del usuario
async function cargarPublicaciones() {
  const { data, error } = await supabase
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
      created_at,
      user_id,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error al cargar publicaciones:", error.message);
    return;
  }

  const publicacionesDiv = document.getElementById("publicaciones");
  publicacionesDiv.innerHTML = "";

  data.forEach((pub) => {
    const pubElement = document.createElement("div");
    pubElement.className =
      "border p-4 mb-4 rounded-lg shadow bg-white w-full md:w-2/3";

    pubElement.innerHTML = `
      <h3 class="text-lg font-bold">${pub.producto} (${pub.cantidad} ${
      pub.unidad
    })</h3>
      <p>Quiere: ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${
      pub.producto_deseado
    }</p>
      <p><strong>Publicado por:</strong> ${
        pub.profiles?.full_name || "Anónimo"
      }</p>
      <p class="text-sm text-gray-500">Publicado el: ${new Date(
        pub.created_at
      ).toLocaleString()}</p>
      ${
        pub.imagen_url
          ? `<img src="${pub.imagen_url}" alt="Imagen" class="w-32 h-32 object-cover mt-2 rounded">`
          : ""
      }
      <button 
        class="toggle-comentarios bg-blue-500 text-white px-3 py-1 mt-3 rounded" 
        data-id="${pub.id}">
        Ver comentarios
      </button>
      <div id="comentarios-${pub.id}" class="mt-3 hidden"></div>
    `;

    publicacionesDiv.appendChild(pubElement);
  });

  // Asignar eventos a los botones de comentarios
  document.querySelectorAll(".toggle-comentarios").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const publicacionId = e.target.getAttribute("data-id");
      const comentariosDiv = document.getElementById(
        `comentarios-${publicacionId}`
      );

      if (comentariosDiv.classList.contains("hidden")) {
        await cargarComentarios(publicacionId);
        comentariosDiv.classList.remove("hidden");
        e.target.textContent = "Ocultar comentarios";
      } else {
        comentariosDiv.classList.add("hidden");
        e.target.textContent = "Ver comentarios";
      }
    });
  });
}

// Función para cargar comentarios de una publicación
async function cargarComentarios(publicacionId) {
  const { data, error } = await supabase
    .from("comentarios")
    .select(`
      id,
      mensaje,
      created_at,
      user_id,
      profiles(full_name)
    `)
    .eq("publicacion_id", publicacionId)
    .order("created_at", { ascending: true });

  const comentariosDiv = document.getElementById(`comentarios-${publicacionId}`);

  if (error) {
    console.error("❌ Error al cargar comentarios:", error.message);
    comentariosDiv.innerHTML =
      "<p class='text-red-500'>Error al cargar comentarios.</p>";
    return;
  }

  if (!data || data.length === 0) {
    comentariosDiv.innerHTML = "<p class='text-gray-500'>Sin comentarios.</p>";
    return;
  }

  comentariosDiv.innerHTML = data
    .map(
      (c) => `
      <div class="border-t pt-2 mt-2">
        <p><strong>${c.profiles?.full_name || "Anónimo"}:</strong> ${
        c.mensaje
      }</p>
        <p class="text-xs text-gray-400">${new Date(
          c.created_at
        ).toLocaleString()}</p>
      </div>
    `
    )
    .join("");
}
