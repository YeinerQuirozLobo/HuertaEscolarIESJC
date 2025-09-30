import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

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
                                <p class="card-text">Desea a cambio: ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${pub.producto_deseado}</p>
                                <p class="card-text"><small class="text-muted">Publicado por ${authorName}</small></p>
                                ${!isOwner ? `<button class="btn btn-outline-success btn-sm" onclick="solicitarIntercambio(${pub.id})">Solicitar intercambio</button>` : ""}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        feedContainer.innerHTML = htmlCards;
    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-center text-danger'>Error al cargar publicaciones</p>";
    }
}

// ---------------------------
// CHAT ENTRE USUARIOS EN MODAL
// ---------------------------

let chatActualId = null;
let intercambioActualId = null;
let participante1Actual = null;
let participante2Actual = null;

// Abrir chat solo si intercambio está ACEPTADO
window.abrirChatPorIntercambio = async (intercambioId) => {
    const { data: intercambio } = await supabase
        .from("intercambios")
        .select("*")
        .eq("id", intercambioId)
        .single();

    if (!intercambio || intercambio.estado !== "ACEPTADO") {
        alert("❌ Este chat solo se puede abrir si el intercambio fue aceptado.");
        return;
    }

    // Verificar o crear chat
    const { data: chatExistente } = await supabase
        .from("chats")
        .select("*")
        .eq("intercambio_id", intercambioId)
        .single();

    let chatId;
    if (!chatExistente) {
        const { data: newChat } = await supabase
            .from("chats")
            .insert({ intercambio_id: intercambioId })
            .select()
            .single();
        chatId = newChat.id;
    } else {
        chatId = chatExistente.id;
    }

    chatActualId = chatId;
    intercambioActualId = intercambioId;

    // Obtener participantes
    const { data: publicacion } = await supabase
        .from("publicaciones")
        .select("user_id")
        .eq("id", intercambio.publicacion_id)
        .single();

    participante1Actual = intercambio.user_id;
    participante2Actual = publicacion.user_id;

    if (currentUserId !== participante1Actual && currentUserId !== participante2Actual) {
        alert("❌ No puedes abrir este chat.");
        return;
    }

    // Abrir modal
    const chatModalEl = document.getElementById('chatModal');
    const chatModal = new bootstrap.Modal(chatModalEl);
    chatModal.show();

    cargarMensajesModal(chatId);
};

// Cargar mensajes en modal
async function cargarMensajesModal(chatId) {
    const contenedor = document.getElementById("mensajesModal");
    contenedor.innerHTML = "";

    const { data: mensajes } = await supabase
        .from("mensajes")
        .select(`*, profiles!remitente(id, full_name)`)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

    if (mensajes && mensajes.length > 0) {
        contenedor.innerHTML = mensajes.map(m => {
            return `<p><strong>${m.remitente.full_name}:</strong> ${m.contenido}</p>`;
        }).join("");
    }

    contenedor.scrollTop = contenedor.scrollHeight;
}

// Enviar mensaje desde modal
document.getElementById("enviarMensajeModalBtn").addEventListener("click", async () => {
    const input = document.getElementById("inputMensajeModal");
    const contenido = input.value.trim();
    if (!contenido) return;

    if (currentUserId !== participante1Actual && currentUserId !== participante2Actual) {
        alert("❌ No puedes enviar mensajes en este chat.");
        return;
    }

    await supabase
        .from("mensajes")
        .insert([{ chat_id: chatActualId, remitente: currentUserId, contenido }]);

    input.value = "";
    cargarMensajesModal(chatActualId);
});
