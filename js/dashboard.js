import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Obtener sesión y usuario actual
let currentUserId = null;
let currentChatId = null;
let chatSubscription = null;

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

    // Evento para enviar mensaje con el botón del modal
    const sendBtn = document.getElementById("sendChatBtn");
    if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
            await enviarMensajeChat();
        });
    }

    // Enviar mensaje con Enter en el input
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
        chatInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                await enviarMensajeChat();
            }
        });
    }
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
                                    <button class="btn btn-success btn-sm" onclick="realizarIntercambio(${pub.id})">Solicitar Intercambio</button>
                                </div>

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

// Función para cargar intercambios (ahora con chat)
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
                    ${(i.estado === "Aceptado") ? `
                        <button class="btn btn-sm btn-primary" onclick="abrirChat(${i.id})">Abrir Chat</button>
                    ` : ""}
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

        // Si es aceptado, crear chat automáticamente
        if (nuevoEstado === "Aceptado") {
            // Verificar si ya existe un chat para este intercambio
            const { data: chatExistente, error: chatCheckError } = await supabase
                .from("chats")
                .select("id")
                .eq("intercambio_id", intercambioId)
                .maybeSingle();

            if (chatCheckError) {
                console.error("❌ Error verificando chat existente:", chatCheckError.message || chatCheckError);
            } else if (!chatExistente) {
                const { data: newChat, error: chatCreateError } = await supabase
                    .from("chats")
                    .insert([{ intercambio_id: intercambioId }])
                    .select()
                    .single();

                if (chatCreateError) {
                    console.error("❌ Error creando chat:", chatCreateError.message || chatCreateError);
                } else {
                    console.log("✅ Chat creado automáticamente:", newChat);
                }
            }
        }

        alert(`✅ Solicitud ${nuevoEstado.toLowerCase()}`);
        cargarIntercambios(pubId, currentUserId);
    } catch (err) {
        console.error("❌ Error al actualizar estado:", err.message);
        alert("❌ No se pudo actualizar la solicitud.");
    }
};

// ----------------------
// 📌 CHAT FUNCTIONS
// ----------------------
window.abrirChat = async (intercambioId) => {
    try {
        // Verificar si ya existe un chat
        let { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id")
            .eq("intercambio_id", intercambioId)
            .maybeSingle();

        if (chatError) {
            console.error("❌ Error buscando chat:", chatError.message || chatError);
            return;
        }

        if (!chat) {
            const { data: nuevoChat, error: nuevoChatError } = await supabase
                .from("chats")
                .insert([{ intercambio_id: intercambioId }])
                .select()
                .single();

            if (nuevoChatError) {
                console.error("❌ Error creando chat:", nuevoChatError.message || nuevoChatError);
                return;
            }
            chat = nuevoChat;
        }

        currentChatId = chat.id;

        // Mostrar modal
        const chatModalEl = document.getElementById("chatModal");
        const chatModal = new bootstrap.Modal(chatModalEl);
        chatModal.show();

        // Cargar mensajes existentes
        await cargarMensajes();

        // Desuscribir suscripción previa si existe
        if (chatSubscription) {
            try {
                await supabase.removeChannel(chatSubscription);
            } catch (e) {
                // ignore errors on unsubscribe
            }
            chatSubscription = null;
        }

        // Escuchar nuevos mensajes (realtime)
        chatSubscription = supabase
            .channel(`mensajes_chat_${currentChatId}`)
            .on("postgres_changes",
                { event: "INSERT", schema: "public", table: "mensajes", filter: `chat_id=eq.${currentChatId}` },
                payload => {
                    renderMensaje(payload.new);
                }
            )
            .subscribe();

    } catch (err) {
        console.error("❌ Error al abrir chat:", err.message);
        alert("❌ No se pudo abrir el chat.");
    }
};

async function cargarMensajes() {
    try {
        const { data: mensajes, error } = await supabase
            .from("mensajes")
            .select("id, remitente, contenido, created_at, profiles(full_name)")
            .eq("chat_id", currentChatId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("❌ Error cargando mensajes:", error.message || error);
            return;
        }

        const chatMessages = document.getElementById("chatMessages");
        chatMessages.innerHTML = "";
        if (!mensajes || mensajes.length === 0) {
            chatMessages.innerHTML = "<p class='text-muted'>No hay mensajes aún. Inicia la conversación!</p>";
            return;
        }

        mensajes.forEach(m => renderMensaje(m));
        // mantener scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error("❌ Error en cargarMensajes:", err.message);
    }
}

function renderMensaje(mensaje) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    // Crear contenedor del mensaje
    const wrapper = document.createElement("div");
    wrapper.className = mensaje.remitente === currentUserId ? "d-flex justify-content-end mb-2" : "d-flex justify-content-start mb-2";

    const bubble = document.createElement("div");
    bubble.className = "p-2 rounded";
    bubble.style.maxWidth = "75%";
    bubble.style.wordBreak = "break-word";

    if (mensaje.remitente === currentUserId) {
        bubble.classList.add("bg-success", "text-white");
        bubble.style.borderRadius = "12px 12px 0 12px";
    } else {
        bubble.classList.add("bg-light", "text-dark", "border");
        bubble.style.borderRadius = "12px 12px 12px 0";
    }

    const senderName = (mensaje.remitente === currentUserId) ? "Tú" : (mensaje.profiles?.full_name || "Usuario");
    const header = document.createElement("div");
    header.className = "small text-muted mb-1";
    header.textContent = senderName;

    const content = document.createElement("div");
    content.textContent = mensaje.contenido;

    bubble.appendChild(header);
    bubble.appendChild(content);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);

    // mantener scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarMensajeChat() {
    try {
        const input = document.getElementById("chatInput");
        if (!input) return;
        const texto = input.value.trim();
        if (!texto) return;
        if (!currentChatId) {
            alert("⚠️ No hay chat abierto.");
            return;
        }

        const { error } = await supabase.from("mensajes").insert([{
            chat_id: currentChatId,
            remitente: currentUserId,
            contenido: texto
        }]);

        if (error) {
            console.error("❌ Error enviando mensaje:", error.message || error);
            return;
        }

        input.value = "";
        // Nota: el mensaje se renderizará por realtime; si quieres mostrarlo inmediatamente,
        // podrías llamar a renderMensaje con los datos locales, pero lo dejamos para Realtime.
    } catch (err) {
        console.error("❌ Error en enviarMensajeChat:", err.message);
    }
}
