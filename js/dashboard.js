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

// 4. Función para proponer un intercambio
window.proponerIntercambio = async function(publicacionId) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    const mensaje = document.getElementById(`mensajeIntercambio-${publicacionId}`).value;

    if (!mensaje) {
        alert("Debes escribir tu propuesta.");
        return;
    }

    const { error } = await supabase
        .from("intercambios")
        .insert([{ publicacion_id: publicacionId, user_id: userId, mensaje, estado: "pendiente" }]);

    if (error) {
        console.error("❌ Error al registrar intercambio:", error.message);
        alert("No se pudo registrar el intercambio.");
    } else {
        alert("✅ Intercambio propuesto con éxito");
        document.getElementById(`mensajeIntercambio-${publicacionId}`).value = "";
        cargarPublicaciones(); // recarga para mostrar los intercambios
    }
}

// 5. Función para eliminar publicación
window.eliminarPublicacion = async function(publicacionId) {
    const confirmDelete = confirm("¿Seguro deseas eliminar esta publicación?");
    if (!confirmDelete) return;

    const { error } = await supabase
        .from("publicaciones")
        .delete()
        .eq("id", publicacionId);

    if (error) {
        console.error("❌ Error al eliminar publicación:", error.message);
        alert("No se pudo eliminar la publicación.");
    } else {
        alert("✅ Publicación eliminada");
        cargarPublicaciones();
    }
}

// 6. Cargar y mostrar publicaciones con intercambios
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    const { data: publicaciones, error: pubError } = await supabase
        .from("publicaciones")
        .select(`
            *,
            profiles(full_name)
        `)
        .order("id", { ascending: false });

    if (pubError) {
        console.error("❌ Error al cargar publicaciones:", pubError.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
        return;
    }

    if (!publicaciones || publicaciones.length === 0) {
        feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
        return;
    }

    let htmlCards = "";

    for (const pub of publicaciones) {
        const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";

        // Traer intercambios de esta publicación
        const { data: intercambios } = await supabase
            .from("intercambios")
            .select(`*, profiles(full_name)`)
            .eq("publicacion_id", pub.id);

        const intercambiosHtml = intercambios && intercambios.length > 0
            ? `<ul>${intercambios.map(i => `<li>${i.mensaje} - por ${i.profiles.full_name} [${i.estado}]</li>`).join("")}</ul>`
            : "<p>No hay intercambios aún.</p>";

        // Mostrar botón eliminar solo si el usuario es el autor
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user.id;
        const eliminarBtn = currentUserId === pub.user_id
            ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>`
            : "";

        htmlCards += `
            <div class="card mb-3 shadow">
                <div class="row g-0">
                    <div class="col-md-4">
                        <img src="${pub.imagen_url || "https://via.placeholder.com/150"}" 
                             class="img-fluid rounded-start h-100 object-fit-cover" 
                             alt="Imagen de ${pub.producto}">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            ${eliminarBtn}
                            <h5 class="card-title text-primary">${pub.producto}</h5>
                            <p class="card-text text-secondary">Cantidad: ${pub.cantidad} ${pub.unidad}</p>
                            <p class="card-text">Deseo a cambio: <strong>${pub.cantidad_deseada} ${pub.unidad_deseada}</strong> de <strong>${pub.producto_deseado}</strong></p>
                            <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>

                            <hr>
                            <h6>Proponer un intercambio:</h6>
                            <textarea id="mensajeIntercambio-${pub.id}" class="form-control mb-2" placeholder="Escribe lo que ofreces..."></textarea>
                            <button class="btn btn-success btn-sm mb-2" onclick="proponerIntercambio(${pub.id})">Proponer intercambio</button>

                            <h6>Intercambios:</h6>
                            ${intercambiosHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    feedContainer.innerHTML = htmlCards;
}
