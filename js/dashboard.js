import { supabase } from "./supabaseClient.js";

// Referencias DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Verificar sesión al cargar
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

// Cerrar sesión
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// Publicar producto
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Debes iniciar sesión para publicar.");
            return;
        }
        const user = session.user;

        const mensaje = document.getElementById("mensaje").value;

        try {
            const { error } = await supabase
                .from("publicaciones")
                .insert([{ user_id: user.id, mensaje, estado: "activo" }]);

            if (error) throw error;

            alert("✅ Publicación realizada con éxito");
            formPublicacion.reset();
            await cargarPublicaciones();
        } catch (err) {
            console.error("❌ Error al publicar:", err.message);
            alert("❌ No se pudo publicar.");
        }
    });
}

// Función para cargar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    try {
        const { data, error } = await supabase
            .from("publicaciones")
            .select(`
                *,
                profiles(full_name)
            `)
            .order("id", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
            return;
        }

        const htmlCards = await Promise.all(data.map(async (pub) => {
            const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";

            // Cargar comentarios para la publicación
            let comentariosHTML = "";
            try {
                const { data: comentarios } = await supabase
                    .from("comentarios")
                    .select(`
                        *,
                        profiles(full_name)
                    `)
                    .eq("publicacion_id", pub.id)
                    .order("id", { ascending: true });

                comentariosHTML = comentarios.map(c => `
                    <p><strong>${c.profiles?.full_name || "Desconocido"}:</strong> ${c.mensaje}</p>
                `).join("");
            } catch (err) {
                console.error("Error al cargar comentarios:", err.message);
                comentariosHTML = "<p class='text-danger'>No se pudieron cargar los comentarios.</p>";
            }

            return `
                <div class="card mb-3 shadow" id="publicacion-${pub.id}">
                    <div class="card-body">
                        <p>${pub.mensaje}</p>
                        <p><small class="text-muted">Publicado por: ${authorName}</small></p>

                        ${pub.user_id === supabase.auth.getUser().then(u => u.data.user.id) ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>` : ""}

                        <div class="mb-2">
                            <h6>Comentarios:</h6>
                            <div id="comentarios-${pub.id}">
                                ${comentariosHTML}
                            </div>
                            <form onsubmit="enviarComentario(event, ${pub.id})">
                                <input type="text" id="comentario-input-${pub.id}" class="form-control mb-1" placeholder="Escribe un comentario..." required>
                                <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
                            </form>
                        </div>

                        <button class="btn btn-success btn-sm" onclick="realizarIntercambio(${pub.id})">Realizar intercambio</button>
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

// Eliminar publicación
window.eliminarPublicacion = async (id) => {
    if (!confirm("¿Deseas eliminar esta publicación?")) return;
    try {
        const { error } = await supabase
            .from("publicaciones")
            .delete()
            .eq("id", id);
        if (error) throw error;
        alert("✅ Publicación eliminada");
        await cargarPublicaciones();
    } catch (err) {
        console.error("Error al eliminar publicación:", err.message);
        alert("❌ No se pudo eliminar la publicación.");
    }
};

// Enviar comentario
window.enviarComentario = async (e, publicacion_id) => {
    e.preventDefault();
    const input = document.getElementById(`comentario-input-${publicacion_id}`);
    const mensaje = input.value.trim();
    if (!mensaje) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Debes iniciar sesión");

        const user = session.user;

        const { error } = await supabase
            .from("comentarios")
            .insert([{ publicacion_id, user_id: user.id, mensaje }]);
        if (error) throw error;

        input.value = "";
        await cargarPublicaciones();
    } catch (err) {
        console.error("Error al enviar comentario:", err.message);
        alert("❌ No se pudo enviar el comentario.");
    }
};

// Realizar intercambio
window.realizarIntercambio = async (publicacion_id) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Debes iniciar sesión");
        const user = session.user;

        const mensaje = prompt("Escribe tu propuesta de intercambio:");
        if (!mensaje) return;

        const { error } = await supabase
            .from("intercambios")
            .insert([{ publicacion_id, user_id: user.id, mensaje, estado: "pendiente" }]);
        if (error) throw error;

        alert("✅ Intercambio registrado");
    } catch (err) {
        console.error("Error al realizar intercambio:", err.message);
        alert("❌ No se pudo registrar el intercambio.");
    }
};
