import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Chat (modal + mensajes)
const chatModalEl = document.getElementById("chatModal");
const chatMensajesEl = document.getElementById("chatMensajes");
const formChat = document.getElementById("formChat");
const chatInput = document.getElementById("chatInput");

let currentUserId = null;
let chatActualId = null;

// ======================= SESIÓN ==========================
document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("Sesión activa:", session);
    if (!session) {
        window.location.href = "index.html";
        return;
    }
    currentUserId = session.user.id;
    console.log("Usuario autenticado ID:", currentUserId);

    await cargarPublicaciones();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// ======================= PUBLICAR ==========================
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

            alert("✅ Publicación realizada con éxito");
            formPublicacion.reset();
            await cargarPublicaciones();
        } catch (err) {
            console.error("❌ Error al publicar:", err.message);
            alert("❌ No se pudo publicar el producto.");
        }
    });
}

// ======================= PUBLICACIONES ==========================
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

        const htmlCards = data.map(pub => {
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

        feedContainer.innerHTML = htmlCards;

        // Cargar comentarios e intercambios
        data.forEach(pub => {
            cargarComentarios(pub.id);
            cargarIntercambios(pub.id, pub.user_id);
        });

    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// ======================= COMENTARIOS ==========================
async function enviarComentario(publicacionId) {
    const textarea = document.getElementById(`comentario-${publicacionId}`);
    const mensaje = textarea.value.trim();
    if (!mensaje) return;

    try {
        const { error } = await supabase
            .from("comentarios")
            .insert([{
                publicacion_id: publicacionId,
                user_id: currentUserId,
                mensaje
            }]);
        if (error) throw error;

        textarea.value = "";
        cargarComentarios(publicacionId);
    } catch (err) {
        console.error("❌ Error al enviar comentario:", err.message);
    }
}

async function cargarComentarios(publicacionId) {
    const comentariosEl = document.getElementById(`comentarios-${publicacionId}`);
    try {
        const { data, error } = await supabase
            .from("comentarios")
            .select("*, profiles!inner(id, full_name)")
            .eq("publicacion_id", publicacionId)
            .order("id", { ascending: true });

        if (error) throw error;

        comentariosEl.innerHTML = data.map(c => `
            <p><strong>${c.profiles.full_name}:</strong> ${c.mensaje}</p>
        `).join("");
    } catch (err) {
        console.error("❌ Error al cargar comentarios:", err.message);
    }
}

// ======================= INTERCAMBIOS ==========================
async function realizarIntercambio(publicacionId) {
    const mensaje = prompt("Escribe tu propuesta de intercambio:");
    if (!mensaje) return;

    try {
        const { error } = await supabase
            .from("intercambios")
            .insert([{
                publicacion_id: publicacionId,
                user_id: currentUserId,
                mensaje,
                estado: "pendiente"
            }]);
        if (error) throw error;

        cargarIntercambios(publicacionId);
    } catch (err) {
        console.error("❌ Error al solicitar intercambio:", err.message);
    }
}

async function actualizarIntercambio(intercambioId, nuevoEstado) {
    try {
        const { error } = await supabase
            .from("intercambios")
            .update({ estado: nuevoEstado })
            .eq("id", intercambioId);
        if (error) throw error;

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al actualizar intercambio:", err.message);
    }
}

async function cargarIntercambios(publicacionId, publicacionOwnerId) {
    const intercambiosEl = document.getElementById(`intercambios-${publicacionId}`);
    if (!intercambiosEl) return;

    try {
        const { data: intercambios, error } = await supabase
            .from("intercambios")
            .select("*, profiles!inner(id, full_name)")
            .eq("publicacion_id", publicacionId);

        if (error) throw error;

        if (!intercambios || intercambios.length === 0) {
            intercambiosEl.innerHTML = `<p class="text-muted">No hay solicitudes de intercambio.</p>`;
            return;
        }

        intercambiosEl.innerHTML = intercambios.map(inter => {
            const isOwner = currentUserId === publicacionOwnerId;
            const isRequester = currentUserId === inter.user_id;

            if (!isOwner && !isRequester) return "";

            let html = `<div class="border p-2 mb-2 rounded">
                <p><strong>${inter.profiles.full_name}</strong> dice: ${inter.mensaje}</p>
                <p>Estado: <span class="badge ${inter.estado === 'aceptado' ? 'bg-success' : inter.estado === 'rechazado' ? 'bg-danger' : 'bg-warning text-dark'}">${inter.estado}</span></p>
            `;

            if (isOwner && inter.estado === "pendiente") {
                html += `
                    <button class="btn btn-sm btn-success me-2" onclick="actualizarIntercambio(${inter.id}, 'aceptado')">Aceptar</button>
                    <button class="btn btn-sm btn-danger" onclick="actualizarIntercambio(${inter.id}, 'rechazado')">Rechazar</button>
                `;
            }

            if ((isOwner || isRequester) && inter.estado === "aceptado") {
                html += `
                    <button class="btn btn-sm btn-primary mt-2" onclick="abrirChat(${inter.id})">Abrir Chat</button>
                `;
            }

            html += `</div>`;
            return html;
        }).join("");

    } catch (err) {
        console.error("❌ Error al cargar intercambios:", err.message);
        intercambiosEl.innerHTML = "<p class='text-danger'>Error al cargar intercambios.</p>";
    }
}

// ======================= CHAT ==========================
window.abrirChat = async function (intercambioId) {
    chatActualId = intercambioId;
    chatMensajesEl.innerHTML = "<p class='text-muted'>Cargando mensajes...</p>";

    const modal = new bootstrap.Modal(chatModalEl);
    modal.show();

    await cargarMensajes(intercambioId);
};

async function cargarMensajes(intercambioId) {
    try {
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id")
            .eq("intercambio_id", intercambioId)
            .single();

        if (chatError && chatError.code !== "PGRST116") throw chatError;

        let chatId = chat ? chat.id : null;

        if (!chatId) {
            const { data: nuevoChat, error: nuevoChatError } = await supabase
                .from("chats")
                .insert([{ intercambio_id: intercambioId }])
                .select()
                .single();
            if (nuevoChatError) throw nuevoChatError;
            chatId = nuevoChat.id;
        }

        chatActualId = chatId;

        const { data: mensajes, error } = await supabase
            .from("mensajes")
            .select("*, profiles!inner(id, full_name)")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        chatMensajesEl.innerHTML = mensajes.map(m => `
            <p><strong>${m.profiles.full_name}:</strong> ${m.contenido}</p>
        `).join("");
    } catch (err) {
        console.error("❌ Error al cargar mensajes:", err.message);
        chatMensajesEl.innerHTML = "<p class='text-danger'>Error al cargar mensajes.</p>";
    }
}

if (formChat) {
    formChat.addEventListener("submit", async (e) => {
        e.preventDefault();
        const contenido = chatInput.value.trim();
        if (!contenido || !chatActualId) return;

        try {
            const { error } = await supabase
                .from("mensajes")
                .insert([{
                    chat_id: chatActualId,
                    remitente: currentUserId,
                    contenido
                }]);
            if (error) throw error;

            chatInput.value = "";
            await cargarMensajes(chatActualId);
        } catch (err) {
            console.error("❌ Error al enviar mensaje:", err.message);
        }
    });
}

// ======================= ELIMINAR PUBLICACIÓN ==========================
window.eliminarPublicacion = async function (publicacionId) {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;

    try {
        const { error } = await supabase
            .from("publicaciones")
            .delete()
            .eq("id", publicacionId);
        if (error) throw error;

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al eliminar publicación:", err.message);
    }
};
