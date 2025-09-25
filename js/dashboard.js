import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// 1. Verificar la sesión del usuario al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Sesión activa:", session);
    console.log("Usuario autenticado ID:", session?.user.id);

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    await cargarPublicaciones();
});

// 2. Manejar el cierre de sesión
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// 3. Manejar el formulario de publicación
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Debes iniciar sesión para publicar un producto.");
            return;
        }
        const user = session.user;

        // Datos del formulario
        const producto = document.getElementById("producto").value;
        const cantidad = document.getElementById("cantidad").value;
        const unidad = document.getElementById("unidad").value;
        const productoDeseado = document.getElementById("productoDeseado").value;
        const cantidadDeseada = document.getElementById("cantidadDeseada").value;
        const unidadDeseada = document.getElementById("unidadDeseada").value;
        const imagenFile = document.getElementById("imagen").files[0];

        try {
            // Subir imagen al bucket "productos"
            let imagen_url = null;
            if (imagenFile) {
                const fileName = `${Date.now()}-${user.id}-${imagenFile.name}`;
                const { data: imgData, error: imgError } = await supabase.storage
                    .from("productos")
                    .upload(fileName, imagenFile);

                if (imgError) throw imgError;

                // Obtener URL pública
                const { data: urlData } = supabase.storage
                    .from("productos")
                    .getPublicUrl(imgData.path);

                imagen_url = urlData.publicUrl;
            }

            // Insertar publicación
            const { error } = await supabase
                .from("publicaciones")
                .insert([
                    {
                        user_id: user.id,
                        producto,
                        cantidad,
                        unidad,
                        imagen_url,
                        producto_deseado: productoDeseado,
                        cantidad_deseada: cantidadDeseada,
                        unidad_deseada: unidadDeseada
                    }
                ]);

            if (error) throw error;

            alert("✅ Publicación realizada con éxito");
            formPublicacion.reset();
            await cargarPublicaciones();
        } catch (err) {
            console.error("❌ Error al publicar:", err.message);
            alert("❌ No se pudo publicar el producto.");
        }
    });
}

// 4. Cargar y mostrar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    const { data, error } = await supabase
        .from("publicaciones")
        .select(`
            *,
            profiles(full_name)
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("❌ Error al cargar publicaciones:", error.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
        return;
    }

    if (!data || data.length === 0) {
        feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
        return;
    }

    const htmlCards = data.map(pub => {
        const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";
        return `
            <div class="card mb-3 shadow">
                <div class="row g-0">
                    <div class="col-md-4">
                        <img src="${pub.imagen_url || "https://via.placeholder.com/150"}" 
                             class="img-fluid rounded-start h-100 object-fit-cover" 
                             alt="Imagen de ${pub.producto}">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <h5 class="card-title text-primary">${pub.producto}</h5>
                            <p class="card-text text-secondary">Cantidad: ${pub.cantidad} ${pub.unidad}</p>
                            <p class="card-text">Deseo a cambio: <strong>${pub.cantidad_deseada} ${pub.unidad_deseada}</strong> de <strong>${pub.producto_deseado}</strong></p>
                            <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    feedContainer.innerHTML = htmlCards;
}

