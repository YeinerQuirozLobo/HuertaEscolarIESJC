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

// Enviar comentario
window.enviarComentario = async function (publicacionId) {
    const comentarioInput = document.getElementById(`comentario-${publicacionId}`);
    const contenido = comentarioInput.value.trim();
    if (!contenido) return;

    try {
        const { error } = await supabase
            .from("comentarios")
            .insert([{ publicacion_id: publicacionId, user_id: currentUserId, contenido }]);
        if (error) throw error;

        comentarioInput.value = "";
        await cargarComentarios(publicacionId);
    } catch (err) {
        console.error("❌ Error al comentar:", err.message);
    }
};

// Cargar comentarios
async function cargarComentarios(publicacionId) {
    try {
        const { data, error } = await supabase
            .from("comentarios")
            .select(`*, profiles!inner(id, full_name)`)
            .eq("publicacion_id", publicacionId)
            .order("id", { ascending: true });

        if (error) throw error;

        const contenedor = document.getElementById(`comentarios-${publicacionId}`);
        contenedor.innerHTML = data.map(com => `
            <p><strong>${com.profiles.full_name}:</strong> ${com.contenido}</p>
        `).join("");
    } catch (err) {
        console.error("❌ Error al cargar comentarios:", err.message);
    }
}

// Realizar intercambio
window.realizarIntercambio = async function (publicacionId) {
    try {
        const { error } = await supabase
            .from("intercambios")
            .insert([{ publicacion_id: publicacionId, solicitante_id: currentUserId, estado: "Pendiente" }]);
        if (error) throw error;

        alert("✅ Solicitud de intercambio enviada");
        await cargarIntercambios(publicacionId);
    } catch (err) {
        console.error("❌ Error al solicitar intercambio:", err.message);
    }
};

// Cargar intercambios
async function cargarIntercambios(publicacionId, ownerId) {
    try {
        const { data, error } = await supabase
            .from("intercambios")
            .select(`*, profiles!inner(id, full_name)`)
            .eq("publicacion_id", publicacionId)
            .order("id", { ascending: true });

        if (error) throw error;

        const contenedor = document.getElementById(`intercambios-${publicacionId}`);
        if (!data || data.length === 0) {
            contenedor.innerHTML = "<p class='text-muted'>No hay solicitudes de intercambio.</p>";
            return;
        }

        contenedor.innerHTML = data.map(inter => {
            const isSolicitante = inter.solicitante_id === currentUserId;
            const isOwner = ownerId === currentUserId;

            // Mostrar botones solo al dueño de la publicación si está pendiente
            let acciones = "";
            if (isOwner && inter.estado === "Pendiente") {
                acciones = `
                    <button class="btn btn-success btn-sm" onclick="actualizarIntercambio(${inter.id}, 'Aceptado')">Aceptar</button>
                    <button class="btn btn-danger btn-sm" onclick="actualizarIntercambio(${inter.id}, 'Rechazado')">Rechazar</button>
                `;
            }

            // Mostrar chat si el intercambio está aceptado y el usuario participa (dueño o solicitante)
            let chatBtn = "";
            if (inter.estado === "Aceptado" && (isOwner || isSolicitante)) {
                chatBtn = `<button class="btn btn-primary btn-sm" onclick="abrirChat(${inter.id})">Abrir Chat</button>`;
            }

            return `
                <p>
                    <strong>${inter.profiles.full_name}</strong> - Estado: ${inter.estado}
                    ${acciones}
                    ${chatBtn}
                </p>
            `;
        }).join("");
    } catch (err) {
        console.error("❌ Error al cargar intercambios:", err.message);
    }
}

// Actualizar estado de intercambio
window.actualizarIntercambio = async function (intercambioId, nuevoEstado) {
    try {
        const { error } = await supabase
            .from("intercambios")
            .update({ estado: nuevoEstado })
            .eq("id", intercambioId);
        if (error) throw error;

        // Si es aceptado, crear chat (si no existe)
        if (nuevoEstado === "Aceptado") {
            const { data: chatExist } = await supabase
                .from("chats")
                .select("*")
                .eq("intercambio_id", intercambioId)
                .single();

            if (!chatExist) {
                await supabase.from("chats").insert([{ intercambio_id: intercambioId }]);
            }
        }

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al actualizar intercambio:", err.message);
    }
};

// Abrir chat
window.abrirChat = async function (intercambioId) {
    chatContainerEl.style.display = "block";
    chatMensajesEl.innerHTML = "<p class='text-muted'>Cargando chat...</p>";

    try {
        // Obtener chat vinculado al intercambio
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("*")
            .eq("intercambio_id", intercambioId)
            .single();

        if (chatError || !chat) {
            chatMensajesEl.innerHTML = "<p class='text-danger'>❌ No se encontró el chat.</p>";
            return;
        }

        chatContainerEl.dataset.chatId = chat.id;

        await cargarMensajes(chat.id);

    } catch (err) {
        console.error("❌ Error al abrir chat:", err.message);
    }
};

// Enviar mensaje al chat
if (formChat) {
    formChat.addEventListener("submit", async (e) => {
        e.preventDefault();
        const chatId = chatContainerEl.dataset.chatId;
        const contenido = chatInput.value.trim();
        if (!contenido) return;

        try {
            const { error } = await supabase
                .from("mensajes")
                .insert([{ chat_id: chatId, remitente: currentUserId, contenido }]);
            if (error) throw error;

            chatInput.value = "";
            await cargarMensajes(chatId);
        } catch (err) {
            console.error("❌ Error al enviar mensaje de chat:", err.message);
        }
    });
}

// Cargar mensajes del chat
async function cargarMensajes(chatId) {
    try {
        const { data, error } = await supabase
            .from("mensajes")
            .select(`*, profiles!inner(id, full_name)`)
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        chatMensajesEl.innerHTML = data.map(msg => `
            <p><strong>${msg.profiles.full_name}:</strong> ${msg.contenido}</p>
        `).join("");
    } catch (err) {
        console.error("❌ Error al cargar mensajes:", err.message);
    }
}

// Eliminar publicación
window.eliminarPublicacion = async function (publicacionId) {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return;

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
