import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// (Chat) referencias
const chatContainerEl = document.getElementById("chatContainer"); // contenedor del chat (card)
const chatMensajesEl = document.getElementById("chatMensajes");   // div donde mostramos mensajes
const formChat = document.getElementById("formChat");
const chatInput = document.getElementById("chatInput");

// Obtener sesión y usuario actual
let currentUserId = null;

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

// Logout
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

// Función para cargar publicaciones
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

        // Cargar comentarios e intercambios por cada publicación
        data.forEach(pub => {
            cargarComentarios(pub.id);
            cargarIntercambios(pub.id, pub.user_id);
        });

    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// Función para eliminar publicación
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

// Función para enviar comentario
window.enviarComentario = async (pubId) => {
    const textarea = document.getElementById(`comentario-${pubId}`);
    const mensaje = textarea.value.trim();
    if (!mensaje) return;

    try {
        const { error } = await supabase
            .from("comentarios")
            .insert([{ publicacion_id: pubId, user_id: currentUserId, mensaje }]);
        if (error) throw error;

        textarea.value = "";
        cargarComentarios(pubId);
    } catch (err) {
        console.error("❌ Error al enviar comentario:", err.message);
        alert("❌ No se pudo enviar el comentario.");
    }
};

// Función para cargar comentarios
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
                    <p class="mb-0">
                        <strong>${c.profiles.full_name}:</strong> ${c.mensaje}
                    </p>
                    ${isCommentOwner ? `
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="eliminarComentario(${c.id}, ${pubId})">
                            🗑️
                        </button>` : ""}
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error("❌ Error al cargar comentarios:", err.message);
        container.innerHTML = "<p class='text-danger'>Error al cargar comentarios.</p>";
    }
}

// Función para eliminar comentario
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

// Función para realizar intercambio
window.realizarIntercambio = async (pubId) => {
    try {
        const mensaje = prompt("Escribe un mensaje para tu solicitud de intercambio (opcional):") || "";

        const { data: newIntercambio, error } = await supabase
            .from("intercambios")
            .insert([{ publicacion_id: pubId, user_id: currentUserId, mensaje, estado: "Pendiente" }])
            .select("id, mensaje, estado, profiles(id, full_name)");

        if (error) throw error;

        cargarIntercambios(pubId);
    } catch (err) {
        console.error("❌ Error al realizar intercambio:", err.message);
        alert("❌ No se pudo solicitar el intercambio.");
    }
};

/*
  Nota importante sobre visibilidad de intercambios:
  - Queremos que el DUEÑO de la publicación vea todas las solicitudes de su publicación.
  - Queremos que el SOLICITANTE vea *su propia* solicitud aunque no sea dueño.
  - Otros usuarios no necesitan ver las solicitudes de terceros.
*/

// Función para cargar intercambios (ahora mostrando al dueño y al solicitante)
async function cargarIntercambios(pubId, ownerId) {
    const container = document.getElementById(`intercambios-${pubId}`);
    container.innerHTML = "Cargando solicitudes de intercambio...";

    try {
        const { data, error } = await supabase
            .from("intercambios")
            .select(`
                id,
                mensaje,
                estado,
                user_id,
                profiles(id, full_name)
            `)
            .eq("publicacion_id", pubId)
            .order("id", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='text-muted'>No hay solicitudes de intercambio.</p>";
            return;
        }

        // Filtrar lo que debe ver el usuario actual:
        // - Si soy el dueño (ownerId) muestro todas.
        // - Si soy solicitante muestro solo mis solicitudes.
        const visible = data.filter(i => {
            if (currentUserId === ownerId) return true;       // dueño ve todo
            if (i.user_id === currentUserId) return true;     // solicitante ve su(s) solicitud(es)
            return false;                                     // otros no ven
        });

        if (visible.length === 0) {
            container.innerHTML = "<p class='text-muted'>No hay solicitudes de intercambio para ti.</p>";
            return;
        }

        container.innerHTML = "<p><strong>Solicitudes de intercambio:</strong></p>" +
            visible.map(i => `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span>${i.profiles.full_name} - ${i.estado} ${i.mensaje ? `: "${i.mensaje}"` : ""}</span>

                    ${(
                        // Si soy el dueño de la publicación y la solicitud está pendiente, puedo aceptar/rechazar
                        (currentUserId === ownerId && i.estado === "Pendiente")
                        ? `
                            <div>
                                <button class="btn btn-sm btn-success" onclick="actualizarEstadoSolicitud(${i.id}, 'Aceptado', ${pubId})">Aceptar</button>
                                <button class="btn btn-sm btn-danger" onclick="actualizarEstadoSolicitud(${i.id}, 'Rechazado', ${pubId})">Rechazar</button>
                            </div>
                        `
                        : ""
                    )}

                    ${(
                        // Mostrar botón de chat si el intercambio está Aceptado y el usuario es parte (dueño o solicitante)
                        (i.estado === "Aceptado" && (currentUserId === ownerId || currentUserId === i.user_id))
                        ? `<button class="btn btn-sm btn-primary" onclick="abrirChat(${i.id})">Abrir Chat</button>`
                        : ""
                    )}
                </div>
            `).join("");
    } catch (err) {
        console.error("❌ Error al cargar intercambios:", err.message);
        container.innerHTML = "<p class='text-danger'>Error al cargar intercambios.</p>";
    }
}

// Función para actualizar estado de intercambio
window.actualizarEstadoSolicitud = async (intercambioId, nuevoEstado, pubId) => {
    try {
        const { error } = await supabase
            .from("intercambios")
            .update({ estado: nuevoEstado })
            .eq("id", intercambioId);

        if (error) throw error;

        // Si se aceptó, crear chat si no existe (esto permitirá que ambos puedan abrir chat)
        if (nuevoEstado === "Aceptado") {
            try {
                const { data: existingChat, error: selErr } = await supabase
                    .from("chats")
                    .select("*")
                    .eq("intercambio_id", intercambioId)
                    .maybeSingle();

                if (selErr) throw selErr;

                if (!existingChat) {
                    const { error: insErr } = await supabase
                        .from("chats")
                        .insert([{ intercambio_id: intercambioId }]);
                    if (insErr) throw insErr;
                }
            } catch (chatErr) {
                console.error("❌ Error creando chat tras aceptar intercambio:", chatErr.message || chatErr);
                // no hacemos rollback sobre la aceptación, pero avisamos en consola
            }
        }

        alert(`✅ Solicitud ${nuevoEstado.toLowerCase()}`);
        cargarIntercambios(pubId, currentUserId);
    } catch (err) {
        console.error("❌ Error al actualizar estado:", err.message);
        alert("❌ No se pudo actualizar la solicitud.");
    }
};

/* =========================
   CHAT (mensajes + realtime)
   ========================= */

let chatActualId = null;
let subscriptionChannel = null;

// abrirChat recibe el intercambioId (id de la fila en 'intercambios')
window.abrirChat = async (intercambioId) => {
    try {
        // buscar chat asociado
        const { data: existingChat, error: selErr } = await supabase
            .from("chats")
            .select("*")
            .eq("intercambio_id", intercambioId)
            .maybeSingle();

        if (selErr) throw selErr;

        let chat;
        if (!existingChat) {
            // crear chat si no existe
            const { data: newChat, error: insErr } = await supabase
                .from("chats")
                .insert([{ intercambio_id: intercambioId }])
                .select()
                .single();
            if (insErr) throw insErr;
            chat = newChat;
        } else {
            chat = existingChat;
        }

        chatActualId = chat.id;

        // Mostrar el contenedor del chat (si está oculto)
        if (chatContainerEl) {
            chatContainerEl.classList.remove("d-none");
            // opcional: scrollear al final
        }

        await cargarMensajes(chatActualId);

        // Desuscribirse del canal anterior (si existe)
        if (subscriptionChannel) {
            try {
                await supabase.removeChannel(subscriptionChannel);
            } catch (e) {
                // ignore
            }
            subscriptionChannel = null;
        }

        // Suscribirse a nuevos mensajes de este chat
        subscriptionChannel = supabase
            .channel(`public:mensajes:chat_${chatActualId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "mensajes", filter: `chat_id=eq.${chatActualId}` },
                (payload) => {
                    const m = payload.new;
                    appendMensajeAlDOM(m);
                }
            )
            .subscribe((status) => {
                // opcional: handle status ('SUBSCRIBED' etc.)
                // console.log('subscription status', status);
            });

    } catch (err) {
        console.error("❌ Error abriendo chat:", err.message || err);
        alert("❌ No se pudo abrir el chat.");
    }
};

async function cargarMensajes(chatId) {
    if (!chatMensajesEl) return;
    chatMensajesEl.innerHTML = "Cargando mensajes...";

    try {
        const { data: mensajes, error } = await supabase
            .from("mensajes")
            .select(`id, remitente, contenido, created_at`)
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (!mensajes || mensajes.length === 0) {
            chatMensajesEl.innerHTML = "<p class='text-muted'>No hay mensajes aún.</p>";
            return;
        }

        chatMensajesEl.innerHTML = mensajes.map(m => renderMensajeHTML(m)).join("");
        // scrollear al final
        chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
    } catch (err) {
        console.error("❌ Error al cargar mensajes:", err.message);
        chatMensajesEl.innerHTML = "<p class='text-danger'>Error cargando mensajes.</p>";
    }
}

function renderMensajeHTML(m) {
    const isMe = m.remitente === currentUserId;
    const who = isMe ? "Tú" : (m.remitente || "Usuario");
    const time = m.created_at ? new Date(m.created_at).toLocaleString() : "";
    return `
        <div class="mb-2 ${isMe ? 'text-end' : 'text-start'}">
            <div class="d-inline-block p-2 rounded ${isMe ? 'bg-primary text-white' : 'bg-light text-dark'}">
                <small class="d-block"><strong>${who}</strong> <span class="text-muted" style="font-size:10px;">${time}</span></small>
                <div>${escapeHtml(m.contenido)}</div>
            </div>
        </div>
    `;
}

function appendMensajeAlDOM(m) {
    if (!chatMensajesEl) return;
    const html = renderMensajeHTML(m);
    chatMensajesEl.insertAdjacentHTML('beforeend', html);
    chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
}

// enviar mensaje desde el form del chat
if (formChat) {
    formChat.addEventListener("submit", async (e) => {
        e.preventDefault();
        const contenido = chatInput.value.trim();
        if (!contenido || !chatActualId) return;

        try {
            const { error } = await supabase
                .from("mensajes")
                .insert([{ chat_id: chatActualId, remitente: currentUserId, contenido }]);

            if (error) throw error;

            chatInput.value = "";
            // cargarMensajes(chatActualId); // no es necesario porque la suscripción añadirá el mensaje
        } catch (err) {
            console.error("❌ Error al enviar mensaje:", err.message);
            alert("❌ No se pudo enviar el mensaje.");
        }
    });
}

// utilidad: escapar HTML para evitar XSS en mensajes
function escapeHtml(unsafe) {
    return unsafe
         .replaceAll('&', "&amp;")
         .replaceAll('<', "&lt;")
         .replaceAll('>', "&gt;")
         .replaceAll('"', "&quot;")
         .replaceAll("'", "&#039;");
}

// función para cerrar chat (opcional)
window.cerrarChat = () => {
    if (chatContainerEl) chatContainerEl.classList.add("d-none");
    chatMensajesEl && (chatMensajesEl.innerHTML = "");
    chatActualId = null;
    if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel).catch(() => {});
        subscriptionChannel = null;
    }
};
