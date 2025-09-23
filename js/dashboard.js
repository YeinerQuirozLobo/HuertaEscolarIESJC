document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPublicacion");
  const feed = document.getElementById("feed");
  const logoutBtn = document.getElementById("logoutBtn");

  // ✅ Publicar producto
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const producto = document.getElementById("producto").value;
      const cantidad = document.getElementById("cantidad").value;
      const unidad = document.getElementById("unidad").value;
      const productoDeseado = document.getElementById("productoDeseado").value;
      const cantidadDeseada = document.getElementById("cantidadDeseada").value;
      const unidadDeseada = document.getElementById("unidadDeseada").value;
      const imagenFile = document.getElementById("imagen").files[0];

      try {
        // Subir imagen al bucket "productos"
        const fileName = `${Date.now()}_${imagenFile.name}`;
        const { data: imgData, error: imgError } = await supabase
          .storage
          .from("productos")
          .upload(fileName, imagenFile);

        if (imgError) throw imgError;

        const { data: urlData } = supabase
          .storage
          .from("productos")
          .getPublicUrl(fileName);

        // Insertar en la tabla publicaciones
        const { error } = await supabase.from("publicaciones").insert([{
          producto,
          cantidad,
          unidad,
          imagen_url: urlData.publicUrl,
          producto_deseado: productoDeseado,
          cantidad_deseada: cantidadDeseada,
          unidad_deseada: unidadDeseada
        }]);

        if (error) throw error;

        alert("✅ Publicación realizada con éxito");
        form.reset();
        cargarPublicaciones();

      } catch (err) {
        console.error("❌ Error al publicar:", err.message);
        alert("❌ No se pudo publicar el producto.");
      }
    });
  }

  // ✅ Cargar publicaciones
  async function cargarPublicaciones() {
    feed.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    const { data, error } = await supabase
      .from("publicaciones")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("❌ Error al cargar publicaciones:", error.message);
      feed.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
      return;
    }

    if (!data || data.length === 0) {
      feed.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
      return;
    }

    feed.innerHTML = data.map(pub => `
      <div class="card mb-3 shadow">
        <div class="card-body">
          <h5 class="card-title text-primary">${pub.producto}</h5>
          <p><strong>Cantidad:</strong> ${pub.cantidad} ${pub.unidad}</p>
          <img src="${pub.imagen_url}" class="img-fluid mb-3" alt="Producto">
          <p><strong>Quiere recibir:</strong> ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${pub.producto_deseado}</p>
        </div>
      </div>
    `).join("");
  }

  cargarPublicaciones();

  // ✅ Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  }
});
