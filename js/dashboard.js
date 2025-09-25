import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Obtener sesión y usuario actual
let usuarioActualId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    usuarioActualId = session.user.id;
    console.log("Sesión activa:", session);
    console.log("Usuario autenticado ID:", usuarioActualId);

    await cargarPublicaciones();
});

// Manejar cierre de sesión
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// Manejar formulario de publicación
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!usuarioActualId) {
            alert("Debes iniciar sesión para publicar un producto.");
            return;
        }

        const producto = document.getElementById("producto").value;
        const cantidad = document.getElementById("cantidad").value;
        const unidad = document.getElementById("unidad").value;
        const productoDeseado = document.getElementById("productoDeseado").value;
        const cantidadDeseada = document.getElementById("cantidadDeseada").value;
        const unidadDeseada = document.getElementById("unidadDeseada").value;
        const mensaje = document.getElementById("mensaje").value;
        const imagenFile = document.getElementById("imagen").files[0];

        try {
            let imagen_url = null;
            if (imagenFile) {
                const fileName = `${Date.now()}-${usuarioActualId}-${imagenFile.name}`;
                const { data: imgData, error: imgError } = await supabase.storage
                    .from("productos")
                    .upload(fileName, imagenFile);

                if (imgError) throw imgError;

                const { data: urlData } = supabase.storage
                    .from("productos")
                    .getPublicUrl(imgData.path);

                imagen_url = urlData.publicUrl;
            }

            const { error } = await supabase
                .from("publicaciones")
                .insert([{
                    user_id: usuarioActualId,
                    producto,
                    cantidad,
                    unidad,
                    imagen_url,
                    producto_deseado: productoDeseado,
                    cantidad_deseada: cantidadDeseada,
                    unidad_deseada: unidadDeseada,
                    mensaje
                }]);

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

// Función para cargar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    try {
        const { data, error } = await supabase
            .from("publicaciones")
            .select(`*, profiles(full_name)`)
            .order("id", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
            return;
        }

        const htmlCards = await Promise.all(data.map(async pub => {
            const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";

            // Cargar comentarios de la publicación
            let comentariosHtml = "";
            try {
                const { data: comentarios, error: errorComentarios } = await supabase
                    .from("comentarios")
                    .select(`*, profiles(full_name)`)
                    .eq("publicacion_id", pub.id)
                    .order("id", { ascending: true });

                if (!errorComentarios && comentarios.length > 0) {
                    comentariosHtml = comentarios.map(c => `
                        <p><strong>${c.profiles ? c.profiles.full_name : "Anonimo"}:</strong> ${c.mensaje}</p>
                    `).join("");
                }
            } catch (err) {
                console.error("Error al cargar comentarios:", err.message);
            }

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
                                <p class="card-text">${pub.mensaje || ""}</p>
                                <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>

                                ${pub.user_id === usuarioActualId ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>` : ""}

                                <!-- Formulario de comentarios -->
                                <div class="mt-2">
                                    <form onsubmit="enviarComentario(event, ${pub.id})">
                                        <input type="text" class="form-control mb-1" id="comentario-${pub.id}" placeholder="Escribe un comentario..." required>
                                        <button type="submit" class="btn btn-sm btn-primary mb-2">Enviar comentario</button>
                                    </form>
                                    <div id="comentarios-${pub.id}">
                                        ${comentariosHtml}
                                    </div>
                                </div>

                                <!-- Botón de intercambio -->
                                <button class="btn btn-success btn-sm" onclick="realizarIntercambio(${pub.id})">Solicitar Intercambio</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }));

        feedContainer.innerHTML = htmlCards.join("");
    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// Función para eliminar publicación
window.eliminarPublicacion = async function(id) {
    if (!confirm("¿Deseas eliminar esta publicación?")) return;
    try {
        const { error } = await supabase.from("publicaciones").delete().eq("id", id);
        if (error) throw error;
        await cargarPublicaciones();
    } catch (err) {
        console.error("Error al eliminar publicación:", err.message);
        alert("No se pudo eliminar la publicación.");
    }
};

// Función para enviar comentario
window.enviarComentario = async function(e, publicacionId) {
    e.preventDefault();
    const input = document.getElementById(`comentario-${publicacionId}`);
    const mensaje = input.value.trim();
    if (!mensaje) return;

    try {
        const { error } = await supabase.from("comentarios").insert([{
            publicacion_id: publicacionId,
            user_id: usuarioActualId,
            mensaje
        }]);
        if (error) throw error;
        input.value = "";
        await cargarPublicaciones();
    } catch (err) {
        console.error("Error al enviar comentario:", err.message);
        alert("No se pudo enviar el comentario.");
    }
};

// Función para solicitar intercambio
window.realizarIntercambio = async function(publicacionId) {
    try {
        const { error } = await supabase.from("intercambios").insert([{
            publicacion_id: publicacionId,
            user_id: usuarioActualId,
            estado: "pendiente"
        }]);
        if (error) throw error;
        alert("✅ Solicitud de intercambio enviada");
    } catch (err) {
        console.error("Error al realizar intercambio:", err.message);
        alert("No se pudo solicitar el intercambio.");
    }
};
