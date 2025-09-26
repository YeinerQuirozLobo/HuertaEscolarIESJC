console.log("✅ Cliente Supabase inicializado");

// 📌 Cargar publicaciones
async function cargarPublicaciones() {
  try {
    const { data, error } = await supabase
      .from("publicaciones")
      .select(`
        id,
        producto,
        cantidad,
        unidad,
        profiles(full_name)
      `)
      .order("create_at", { ascending: false });

    if (error) throw error;

    const publicacionesDiv = document.getElementById("publicaciones");
    publicacionesDiv.innerHTML = "";

    data.forEach(p => {
      publicacionesDiv.innerHTML += `
        <div class="publicacion">
          <h3>${p.producto}</h3>
          <p><strong>Cantidad:</strong> ${p.cantidad} ${p.unidad}</p>
          <p><strong>Publicado por:</strong> ${p.profiles?.full_name || "Anónimo"}</p>
          <button onclick="toggleComentarios(${p.id})" id="btn-comentarios-${p.id}">Ver comentarios</button>
          <div id="comentarios-${p.id}" class="comentarios" style="display: none;"></div>
          <button onclick="eliminarPublicacion(${p.id})" class="btn-eliminar">Eliminar</button>
        </div>
      `;
    });

  } catch (err) {
    console.error("❌ Error al cargar publicaciones:", err.message);
  }
}

// 📌 Alternar mostrar/ocultar comentarios
async function toggleComentarios(publicacionId) {
  const comentariosDiv = document.getElementById(`comentarios-${publicacionId}`);
  const btn = document.getElementById(`btn-comentarios-${publicacionId}`);

  if (comentariosDiv.style.display === "none") {
    await cargarComentarios(publicacionId);
    comentariosDiv.style.display = "block";
    btn.textContent = "Ocultar comentarios";
  } else {
    comentariosDiv.style.display = "none";
    btn.textContent = "Ver comentarios";
  }
}

// 📌 Cargar comentarios de una publicación
async function cargarComentarios(publicacionId) {
  try {
    const { data, error } = await supabase
      .from("comentarios")
      .select(`
        id,
        mensaje,
        created_at,
        profiles(full_name)
      `)
      .eq("publicacion_id", publicacionId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const comentariosDiv = document.getElementById(`comentarios-${publicacionId}`);
    comentariosDiv.innerHTML = "";

    if (data.length === 0) {
      comentariosDiv.innerHTML = "<p class='sin-comentarios'>No hay comentarios aún.</p>";
      return;
    }

    data.forEach(c => {
      comentariosDiv.innerHTML += `
        <div class="comentario">
          <p><strong>${c.profiles?.full_name || "Anónimo"}:</strong> ${c.mensaje}</p>
          <small>${new Date(c.created_at).toLocaleString()}</small>
        </div>
      `;
    });
  } catch (err) {
    console.error("❌ Error al cargar comentarios:", err.message);
  }
}

// 📌 Eliminar publicación
async function eliminarPublicacion(publicacionId) {
  if (!confirm("¿Seguro que quieres eliminar esta publicación?")) return;

  try {
    const { error } = await supabase
      .from("publicaciones")
      .delete()
      .eq("id", publicacionId);

    if (error) throw error;

    alert("✅ Publicación eliminada");
    cargarPublicaciones();
  } catch (err) {
    console.error("❌ Error al eliminar publicación:", err.message);
  }
}

// 📌 Cargar intercambios
async function cargarIntercambios() {
  try {
    const { data, error } = await supabase
      .from("intercambios")
      .select(`
        id,
        mensaje,
        estado,
        created_at,
        publicaciones(producto),
        profiles(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const intercambiosDiv = document.getElementById("intercambios");
    intercambiosDiv.innerHTML = "";

    data.forEach(i => {
      intercambiosDiv.innerHTML += `
        <div class="intercambio">
          <p><strong>${i.profiles?.full_name || "Anónimo"}:</strong> ${i.mensaje}</p>
          <p><strong>Publicación:</strong> ${i.publicaciones?.producto || "N/A"}</p>
          <p><strong>Estado:</strong> ${i.estado}</p>
          <small>${new Date(i.created_at).toLocaleString()}</small>
        </div>
      `;
    });
  } catch (err) {
    console.error("❌ Error al cargar intercambios:", err.message);
  }
}

// 📌 Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  console.log("Usuario autenticado ID:", session.user.id);

  cargarPublicaciones();
  cargarIntercambios();
});
