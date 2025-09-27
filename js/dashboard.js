import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Usuario actual
let currentUserId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    currentUserId = session.user.id;
    await cargarPublicaciones();
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// Manejo de formulario de publicación
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();
        const producto = document.getElementById("producto").value;
        const cantidad = document.getElementById("cantidad").value;
        const unidad = document.getElementById("unidad").value;
        const productoDeseado = document.getElementById("productoDeseado").value;
        const cantidadDeseada = document.getElementById("cantidadDeseada").value;
        const unidadDeseada = document.getElementById("unidadDeseada").value;
        const imagenFile = document.getElementById("imagen").files[0];

        try {
            let imagen_url = null;
            if (imagenFile) {
                const fileName = `${Date.now()}-${currentUserId}-${imagenFile.name}`;
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

            formPublicacion.reset();
            await cargarPublicaciones();
        } catch (err) {
            console.error("Error al publicar:", err.message);
            alert("No se pudo publicar el producto.");
        }
    });
}

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

        // Leyenda visual de intercambios
        const leyendaHTML = `
            <div class="mb-3">
                <span class="badge bg-warning">Pendiente</span>
                <span class="badge bg-success">Aceptado</span>
                <span class="badge bg-danger">Rechazado</span>
            </div>
        `;
        feedContainer.innerHTML = leyendaHTML;

        feedContainer.innerHTML += data.map(pub => {
            const authorName = pub.profiles.full_name;
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
                            <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>

                            ${isOwner ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>` : ''}

                            <div class="mb-2">
                                <textarea id="comentario-${pub.id}" class="form-control mb-1" placeholder="Escribe un comentario"></textarea>
                                <button class="btn btn-primary btn-sm" onclick="enviarComentario(${pub.id})">Comentar</button>
                            </div>

                            <div class="mb-2">
                                <input type="text" id="mensajeIntercambio-${pub.id}" class="form-control mb-1" placeholder="Mensaje opcional">
                                <button class="btn btn-success btn-sm" onclick="realizarIntercambio(${pub.id})">Solicitar Intercambio</button>
                            </div>

                            <div id="comentarios-${pub.id}"></div>
                            <div id="intercambios-${pub.id}"></div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join("");

        data.forEach(pub => {
            cargarComentarios(pub.id);
            cargarIntercambios(pub.id, pub.user_id); // <-- pasar ownerId
        });
    } catch (err) {
        console.error("Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// Funciones de publicaciones
window.eliminarPublicacion = async (pubId) => {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    try {
        const { error } = await supabase.from("publicaciones").delete()
            .eq("id", pubId).eq("user_id", currentUserId);
        if (error) throw error;
        await cargarPublicaciones();
    } catch (err) {
        console.error(err.message);
        alert("No se pudo eliminar la publicación.");
    }
};

// Funciones de comentarios
window.enviarComentario = async (pubId) => {
    const mensaje = document.getElementById(`comentario-${pubId}`).value.trim();
    if (!mensaje) return;
    try {
        const { error } = await supabase.from("comentarios").insert([{ publicacion_id: pubId, user_id: currentUserId, mensaje }]);
        if (error) throw error;
        document.getElementById(`comentario-${pubId}`).value = "";
        cargarComentarios(pubId);
    } catch (err) {
        console.error(err.message);
        alert("No se pudo enviar el comentario.");
    }
};

async function cargarComentarios(pubId) {
    const container = document.getElementById(`comentarios-${pubId}`);
    container.innerHTML = "Cargando comentarios...";
    try {
        const { data, error } = await supabase.from("comentarios")
            .select("*, profiles!inner(id, full_name)")
            .eq("publicacion_id", pubId).order("id", { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='text-muted'>No hay comentarios aún.</p>";
            return;
        }

        container.innerHTML = data.map(c => `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <p class="mb-0"><strong>${c.profiles.full_name}:</strong> ${c.mensaje}</p>
                ${c.user_id === currentUserId ? `<button class="btn btn-sm btn-outline-danger ms-2" onclick="eliminarComentario(${c.id}, ${pubId})">🗑️</button>` : ""}
            </div>
        `).join("");
    } catch (err) {
        console.error(err.message);
        container.innerHTML = "<p class='text-danger'>Error al cargar comentarios.</p>";
    }
}

window.eliminarComentario = async (comentarioId, pubId) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;
    try {
        const { error } = await supabase.from("comentarios").delete()
            .eq("id", comentarioId).eq("user_id", currentUserId);
        if (error) throw error;
        cargarComentarios(pubId);
    } catch (err) {
        console.error(err.message);
        alert("No se pudo eliminar el comentario.");
    }
};

// Funciones de intercambios
window.realizarIntercambio = async (pubId) => {
    const mensaje = document.getElementById(`mensajeIntercambio-${pubId}`).value.trim();
    try {
        const { error } = await supabase.from("intercambios")
            .insert([{ publicacion_id: pubId, user_id:
