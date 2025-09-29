// dashboard.js
import { supabase } from "./supabaseClient.js";

// Referencias del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// =============================
// Autenticación
// =============================
let currentUser = null;

supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
        currentUser = data.session.user;
        console.log("Sesión activa:", data.session);
        console.log("Usuario autenticado ID:", currentUser.id);
        cargarPublicaciones();
    } else {
        window.location.href = "index.html";
    }
});

logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
});

// =============================
// Crear publicación
// =============================
formPublicacion.addEventListener("submit", async (e) => {
    e.preventDefault();

    const producto = document.getElementById("producto").value;
    const cantidad = document.getElementById("cantidad").value;
    const unidad = document.getElementById("unidad").value;
    const productoDeseado = document.getElementById("productoDeseado").value;
    const cantidadDeseada = document.getElementById("cantidadDeseada").value;
    const unidadDeseada = document.getElementById("unidadDeseada").value;
    const imagenFile = document.getElementById("imagen").files[0];

    let imagenUrl = null;

    if (imagenFile) {
        const { data, error } = await supabase.storage
            .from("imagenes")
            .upload(`publicaciones/${Date.now()}-${imagenFile.name}`, imagenFile);

        if (error) {
            console.error("Error subiendo imagen:", error.message);
        } else {
            const { data: publicURL } = supabase.storage
                .from("imagenes")
                .getPublicUrl(data.path);
            imagenUrl = publicURL.publicUrl;
        }
    }

    const { error } = await supabase.from("publicaciones").insert([
        {
            producto,
            cantidad,
            unidad,
            producto_deseado: productoDeseado,
            cantidad_deseada: cantidadDeseada,
            unidad_deseada: unidadDeseada,
            imagen_url: imagenUrl,
            user_id: currentUser.id,
        },
    ]);

    if (error) {
        console.error("Error creando publicación:", error.message);
    } else {
        formPublicacion.reset();
        cargarPublicaciones();
    }
});

// =============================
// Cargar publicaciones
// =============================
async function cargarPublicaciones() {
    feedContainer.innerHTML = "";

    const { data: publicaciones, error } = await supabase
        .from("publicaciones")
        .select("*, profiles(full_name)")
        .order("id", { ascending: false });

    if (error) {
        console.error("Error cargando publicaciones:", error.message);
        return;
    }

    publicaciones.forEach((pub) => {
        const card = document.createElement("div");
        card.classList.add("card", "mb-4", "shadow");

        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${pub.producto} - ${pub.cantidad} ${pub.unidad}</h5>
                <p class="card-text"><strong>Desea a cambio:</strong> ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${pub.producto_deseado}</p>
                ${
                    pub.imagen_url
                        ? `<img src="${pub.imagen_url}" class="img-fluid mb-2" alt="Imagen">`
                        : ""
                }
                <p><small>Publicado por: ${pub.profiles?.full_name || "Anónimo"}</small></p>

                ${
                    pub.user_id !== currentUser.id
                        ? `
                    <textarea class="form-control mb-2" placeholder="Escribe tu propuesta de intercambio"></textarea>
                    <button class="btn btn-primary btn-sm" onclick="solicitarIntercambio(${pub.id}, this)">Solicitar intercambio</button>
                `
                        : `<div id="intercambios-${pub.id}" class="mt-3"></div>`
                }
            </div>
            <div class="card-footer">
                <h6>Comentarios</h6>
                <div id="comentarios-${pub.id}" class="mb-2"></div>
                <textarea class="form-control mb-2" placeholder="Escribe un comentario"></textarea>
                <button class="btn btn-secondary btn-sm" onclick="enviarComentario(${pub.id}, this)">Comentar</button>
            </div>
        `;

        feedContainer.appendChild(card);

        if (pub.user_id === currentUser.id) {
            cargarSolicitudes(pub.id);
        }
        cargarComentarios(pub.id);
    });
}

// =============================
// Intercambios
// =============================
window.solicitarIntercambio = async function (publicacionId, btn) {
    const mensaje = btn.previousElementSibling.value;

    const { error } = await supabase.from("intercambios").insert([
        {
            publicacion_id: publicacionId,
            user_id: currentUser.id,
            mensaje,
            estado: "Pendiente",
        },
    ]);

    if (error) {
        console.error("Error creando intercambio:", error.message);
    } else {
        alert("Solicitud enviada.");
        btn.previousElementSibling.value = "";
    }
};

async function cargarSolicitudes(publicacionId) {
    const contenedor = document.getElementById(`intercambios-${publicacionId}`);
    contenedor.innerHTML = "";

    const { data: intercambios, error } = await supabase
        .from("intercambios")
        .select("*, profiles(full_name)")
        .eq("publicacion_id", publicacionId);

    if (error) {
        console.error("Error cargando intercambios:", error.message);
        return;
    }

    intercambios.forEach((int) => {
        const div = document.createElement("div");
        div.classList.add("border", "p-2", "mb-2");

        div.innerHTML = `
            <p><strong>${int.profiles?.full_name || "Anon"}:</strong> ${int.mensaje}</p>
            <p><small>Estado: ${int.estado}</small></p>
            ${
                int.estado === "Pendiente"
                    ? `
                <button class="btn btn-success btn-sm" onclick="responderIntercambio(${int.id}, 'Aceptado')">Aceptar</button>
                <button class="btn btn-danger btn-sm" onclick="responderIntercambio(${int.id}, 'Rechazado')">Rechazar</button>
            `
                    : int.estado === "Aceptado"
                    ? `<button class="btn btn-info btn-sm" onclick="abrirChat(${int.id})">Abrir Chat</button>`
                    : ""
            }
        `;
        contenedor.appendChild(div);
    });
}

window.responderIntercambio = async function (id, estado) {
    const { error } = await supabase
        .from("intercambios")
        .update({ estado })
        .eq("id", id);

    if (error) {
        console.error("Error actualizando intercambio:", error.message);
    } else {
        alert(`Intercambio ${estado}`);
        cargarPublicaciones();

        if (estado === "Aceptado") {
            // Crear un chat si no existe
            const { data: chat } = await supabase
                .from("chats")
                .select("*")
                .eq("intercambio_id", id)
                .maybeSingle();

            if (!chat) {
                await supabase.from("chats").insert([{ intercambio_id: id }]);
            }
        }
    }
};

// =============================
// Comentarios
// =============================
window.enviarComentario = async function (publicacionId, btn) {
    const mensaje = btn.previousElementSibling.value;

    const { error } = await supabase.from("comentarios").insert([
        {
            publicacion_id: publicacionId,
            user_id: currentUser.id,
            mensaje,
        },
    ]);

    if (error) {
        console.error("Error creando comentario:", error.message);
    } else {
        btn.previousElementSibling.value = "";
        cargarComentarios(publicacionId);
    }
};

async function cargarComentarios(publicacionId) {
    const contenedor = document.getElementById(`comentarios-${publicacionId}`);
    contenedor.innerHTML = "";

    const { data: comentarios, error } = await supabase
        .from("comentarios")
        .select("*, profiles(full_name)")
        .eq("publicacion_id", publicacionId);

    if (error) {
        console.error("Error cargando comentarios:", error.message);
        return;
    }

    comentarios.forEach((c) => {
        const div = document.createElement("div");
        div.classList.add("border", "p-1", "mb-1");
        div.innerHTML = `<strong>${c.profiles?.full_name || "Anon"}:</strong> ${c.mensaje}`;
        contenedor.appendChild(div);
    });
}

// =============================
// CHAT
// =============================
let chatActualId = null;

window.abrirChat = async function (intercambioId) {
    // Buscar o crear chat
    let { data: chat } = await supabase
        .from("chats")
        .select("*")
        .eq("intercambio_id", intercambioId)
        .maybeSingle();

    if (!chat) {
        const { data: nuevo } = await supabase
            .from("chats")
            .insert([{ intercambio_id: intercambioId }])
            .select()
            .single();
        chat = nuevo;
    }

    chatActualId = chat.id;
    document.getElementById("chatModal").style.display = "block";
    cargarMensajes(chatActualId);
    escucharMensajes(chatActualId);
};

async function cargarMensajes(chatId) {
    const contenedor = document.getElementById("chatMessages");
    contenedor.innerHTML = "";

    const { data: mensajes, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error cargando mensajes:", error.message);
        return;
    }

    mensajes.forEach((m) => {
        const div = document.createElement("div");
        div.textContent = `${m.remitente}: ${m.contenido}`;
        contenedor.appendChild(div);
    });
}

function escucharMensajes(chatId) {
    supabase
        .channel("mensajes")
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "mensajes", filter: `chat_id=eq.${chatId}` },
            (payload) => {
                const m = payload.new;
                const contenedor = document.getElementById("chatMessages");
                const div = document.createElement("div");
                div.textContent = `${m.remitente}: ${m.contenido}`;
                contenedor.appendChild(div);
            }
        )
        .subscribe();
}

document.getElementById("sendMessageBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    const contenido = input.value.trim();
    if (!contenido || !chatActualId) return;

    const { error } = await supabase.from("mensajes").insert([
        {
            chat_id: chatActualId,
            remitente: currentUser.id,
            contenido,
        },
    ]);

    if (error) {
        console.error("Error enviando mensaje:", error.message);
    } else {
        input.value = "";
    }
});

window.cerrarChat = function () {
    document.getElementById("chatModal").style.display = "none";
    chatActualId = null;
};
