import { supabase } from "./supabaseClient.js";

// 🔹 Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

let currentUserId = null;

// 🔹 Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        console.log("Sesión activa:", session);

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        currentUserId = session.user.id;
        console.log("Usuario autenticado ID:", currentUserId);

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al obtener la sesión:", err.message);
        window.location.href = "index.html";
    }
});

// 🔹 Logout
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// 🔹 Manejar formulario de publicación
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const producto = document.getElementById("producto").value.trim();
        const cantidad = document.getElementById("cantidad").value.trim();
        const unidad = document.getElementById("unidad").value.trim();
        const productoDeseado = document.getElementById("productoDeseado").value.trim();
        const cantidadDeseada = document.getElementById("cantidadDeseada").value.trim();
        const unidadDeseada = document.getElementById("unidadDeseada").value.trim();
        const imagenFile = document.getElementById("imagen").files[0];

        try {
            let imagen_url = null;

            // 🔹 Subir imagen si existe
            if (imagenFile) {
                const fileName = `${Date.now()}-${currentUserId}-${imagenFile.name}`;
                const { data: imgData, error: imgError } = await supabase
                    .storage
                    .from("productos")
                    .upload(fileName, imagenFile);

                if (imgError) throw imgError;

                const { data: urlData } = supabase
                    .storage
                    .from("productos")
                    .getPublicUrl(imgData.path);

                imagen_url = urlData.publicUrl;
            }

            // 🔹 Insertar publicación
            const { error } = await supabase.from("publicaciones").insert([{
                user_id: currentUserId,
                producto,
                cantidad,
                unidad,
                imagen_url,
                producto_deseado: productoDeseado,
                cantidad_deseada: cantidadDeseada,
                unidad_deseada: unidadDeseada
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

// ============================================================
// 🔹 Funciones principales
// ============================================================

// Cargar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    try {
        const { data, error } = await supabase
            .from("publicaciones")
            .select(`*, profiles!inner(id, full_name)`)
            .order("id", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
            return;
        }

        feedContainer.innerHTML = data.map(pub => {
            const isOwner = pub.user_id === currentUserId;

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
                                <p class="card-text"><small class="text-muted">Publicado por: ${pub.profiles.full_name}</small></p>

                                ${isOwner ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>` : ''}

                                <div class="mb-2">
                                    <textarea id="comentario-${pub.id}" class="form-control mb-1" placeholder="Escribe un comentario"></textarea>
                                    <button class="btn btn-primary btn-sm" onclick="enviarComentario(${pub.id})">Comentar</button>
                                </div>

                                <div class="mb-2">
                                    <button class="btn btn-success btn-sm" onclick="realizarIntercambio(${pub.id})">Solicitar Intercambio</button>
                                </div>

                                <div id="comentarios-${pub.id}"></div>
                                <div id="intercambios-${pub.id}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        // 🔹 Cargar comentarios e intercambios de cada publicación
        data.forEach(pub => {
            cargarComentarios(pub.id);
            cargarIntercambios(pub.id, pub.user_id);
        });

    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// ============================================================
// 🔹 Funciones CRUD
// ============================================================

// Eliminar publicación
window.eliminarPublicacion = async (pubId) => {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;

    try {
        const { error } = await supabase
            .from("publicaciones")
            .delete()
            .eq("id", pubId)
            .eq("user_id", currentUserId);

        if (error) throw error;

        alert("✅ Publicación eliminada");
        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al eliminar publicación:", err.message);
        alert("❌ No se pudo eliminar la publicación.");
    }
};

// Enviar comentario
window.enviarComentario = async (pubId) => {
    const textarea = document.getElementById(`comentario-${pubId}`);
    const mensaje = textarea.value.trim();
    if (!mensaje) return;

    try {
        const { error } = await supabase.from("comentarios").insert([{
            publicacion_id: pubId,
            user_id: currentUserId,
            mensaje
        }]);

        if (error) throw error;

        textarea.value = "";
        cargarComentarios(pubId);
    } catch (err) {
        console.error("❌ Error al enviar comentario:", err.message);
        alert("❌ No se pudo enviar el comentario.");
    }
};

// Cargar comentarios
async function cargarComentarios(pubId) {
    const container = document.getElementById(`comentarios-${pubId}`);
    container.innerHTML = "Cargando comentarios...";

    try {
        const { data, error } = await supabase
            .from("comentarios")
            .select(`*, profiles!inner(id, full_name)`)
            .eq("publicacion_id", pubId)
            .order("id", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='text-muted'>No hay comentarios aún.</p>";
            return;
        }

        container.innerHTML = data.map(c => {
            const isCommentOwner = c.user_id === currentUserId;
            return `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <p class="mb-0"><strong>${c.profiles.full_name}:</strong> ${c.mensaje}</p>
                    ${isCommentOwner ? `<button class="btn btn-sm btn-outline-danger ms-2" onclick="eliminarComentario(${c.id}, ${pubId})">🗑️</button>` : ""}
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("❌ Error al cargar comentarios:", err.message);
        container.innerHTML = "<p class='text-danger'>Error al cargar comentarios.</p>";
    }
}

// Eliminar comentario
window.eliminarComentario = async (comentarioId, pubId) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;

    try {
        const { error } = await supabase
            .from("comentarios")
            .delete()
            .eq("id", comentarioId)
            .eq("user_id", currentUserId);

        if (error) throw error;

        alert("✅ Comentario eliminado");
        cargarComentarios(pubId);
    } catch (err) {
        console.error("❌ Error al eliminar comentario:", err.message);
        alert("❌ No se pudo eliminar el comentario.");
    }
};

// Realizar intercambio
window.realizarIntercambio = async (pubId) => {
    try {
        const mensaje = prompt("Escribe un mensaje para tu solicitud de intercambio (opcional):") || "";

        const { error } = await supabase.from("intercambios").insert([{
            publicacion_id: pubId,
            user_id: currentUserId,
            mensaje,
            estado: "Pendiente"
        }]);

        if (error) throw error;

        cargarIntercambios(pubId);
    } catch (err) {
        console.error("❌ Error al realizar intercambio:", err.message);
        alert("❌ No se pudo solicitar el intercambio.");
    }
};

// Cargar intercambios
async function cargarIntercambios(pubId, ownerId) {
    const container = document.getElementById(`intercambios-${pubId}`);
    container.innerHTML = "Cargando solicitudes de intercambio...";

    try {
        const { data, error } = await supabase
            .from("intercambios")
            .select(`id, mensaje, estado, user_id, profiles(id, full_name)`)
            .eq("publicacion_id", pubId)
            .order("id", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='text-muted'>No hay solicitudes de intercambio.</p>";
            return;
        }

        container.innerHTML = "<p><strong>Solicitudes de intercambio:</strong></p>" +
            data.map(i => `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span>${i.profiles.full_name} - ${i.estado} ${i.mensaje ? `: "${i.mensaje}"` : ""}</span>
                    ${(currentUserId === ownerId && i.estado === "Pendiente") ? `
                        <div>
                            <button class="btn btn-sm btn-success" onclick="actualizarEstadoSolicitud(${i.id}, 'Aceptado', ${pubId})">Aceptar</button>
                            <button class="btn btn-sm btn-danger" onclick="actualizarEstadoSolicitud(${i.id}, 'Rechazado', ${pubId})">Rechazar</button>
                        </div>
                    ` : ""}
                </div>
            `).join("");
    } catch (err) {
        console.error("❌ Error al cargar intercambios:", err.message);
        container.innerHTML = "<p class='text-danger'>Error al cargar intercambios.</p>";
    }
}

// Actualizar estado de intercambio
window.actualizarEstadoSolicitud = async (intercambioId, nuevoEstado, pubId) => {
    try {
        const { error } = await supabase
            .from("intercambios")
            .update({ estado: nuevoEstado })
            .eq("id", intercambioId);

        if (error) throw error;

        alert(`✅ Solicitud ${nuevoEstado.toLowerCase()}`);
        cargarIntercambios(pubId, currentUserId);
    } catch (err) {
        console.error("❌ Error al actualizar estado:", err.message);
        alert("❌ No se pudo actualizar la solicitud.");
    }
};
