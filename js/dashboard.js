import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = supabase.auth.getUser(); 
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    console.log("Usuario autenticado ID:", userId);

    const publicacionesContainer = document.getElementById("publicacionesContainer");

    // Función para cargar publicaciones
    async function cargarPublicaciones() {
        try {
            const { data: publicaciones, error } = await supabase
                .from("publicaciones")
                .select("id, user_id, mensaje, create_at, profiles(full_name)")
                .order("create_at", { ascending: false });

            if (error) throw error;

            publicacionesContainer.innerHTML = "";

            for (let pub of publicaciones) {
                // Crear contenedor de publicación
                const card = document.createElement("div");
                card.classList.add("card", "mb-3", "p-3");

                card.innerHTML = `
                    <p><strong>${pub.profiles.full_name}</strong> dice:</p>
                    <p>${pub.mensaje}</p>
                    <small>${new Date(pub.create_at).toLocaleString()}</small>
                    <div id="comentarios-${pub.id}" class="mt-2"></div>
                    <form onsubmit="enviarComentario(event, '${pub.id}')">
                        <input type="text" name="mensaje" placeholder="Escribe un comentario..." class="form-control my-2" required>
                        <button type="submit" class="btn btn-primary btn-sm">Comentar</button>
                    </form>
                    ${pub.user_id === userId ? `<button class="btn btn-danger btn-sm mt-2" onclick="eliminarPublicacion('${pub.id}')">Eliminar</button>` : ""}
                `;

                publicacionesContainer.appendChild(card);

                // Cargar comentarios de la publicación
                await cargarComentarios(pub.id);
            }
        } catch (err) {
            console.error("❌ Error al cargar publicaciones:", err.message);
            publicacionesContainer.innerHTML = `<p>Error al cargar publicaciones</p>`;
        }
    }

    // Función para cargar comentarios de una publicación
    async function cargarComentarios(publicacionId) {
        try {
            const { data: comentarios, error } = await supabase
                .from("comentarios")
                .select("id, mensaje, create_at, profiles(full_name)")
                .eq("publicacion_id", publicacionId)
                .order("create_at", { ascending: true });

            if (error) throw error;

            const comentariosDiv = document.getElementById(`comentarios-${publicacionId}`);
            comentariosDiv.innerHTML = "";

            comentarios.forEach(c => {
                const p = document.createElement("p");
                p.innerHTML = `<strong>${c.profiles.full_name}:</strong> ${c.mensaje} <small>(${new Date(c.create_at).toLocaleString()})</small>`;
                comentariosDiv.appendChild(p);
            });
        } catch (err) {
            console.error("Error al cargar comentarios:", err.message);
        }
    }

    // Función global para enviar comentario
    window.enviarComentario = async function (event, publicacionId) {
        event.preventDefault();
        const input = event.target.mensaje;
        const mensaje = input.value;

        try {
            const { data, error } = await supabase
                .from("comentarios")
                .insert([{ publicacion_id: publicacionId, user_id: userId, mensaje }]);

            if (error) throw error;

            input.value = "";
            await cargarComentarios(publicacionId);
        } catch (err) {
            console.error("Error al enviar comentario:", err.message);
        }
    };

    // Función global para eliminar publicación
    window.eliminarPublicacion = async function (publicacionId) {
        if (!confirm("¿Deseas eliminar esta publicación?")) return;

        try {
            const { error } = await supabase
                .from("publicaciones")
                .delete()
                .eq("id", publicacionId)
                .eq("user_id", userId);

            if (error) throw error;

            await cargarPublicaciones();
        } catch (err) {
            console.error("Error al eliminar publicación:", err.message);
        }
    };

    // Inicializar carga de publicaciones
    await cargarPublicaciones();
});
