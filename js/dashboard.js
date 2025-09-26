import { supabase } from "./supabaseClient.js";

// Renderizar publicaciones en el feed
async function renderPosts() {
    const { data: posts, error } = await supabase
        .from("posts")
        .select(`
            id, titulo, descripcion, imagen_url, created_at, user_id,
            users ( id, nombre, email )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error cargando publicaciones:", error);
        return;
    }

    const feed = document.getElementById("feed");
    feed.innerHTML = "";

    const {
        data: { user }
    } = await supabase.auth.getUser();

    for (const post of posts) {
        // Consultar solicitudes de intercambio de este post
        const { data: solicitudes, error: errorSolicitudes } = await supabase
            .from("intercambios")
            .select(`
                id, estado, solicitante_id,
                solicitante:users ( id, nombre, email )
            `)
            .eq("post_id", post.id);

        if (errorSolicitudes) {
            console.error("Error cargando solicitudes:", errorSolicitudes);
        }

        // Construir tarjeta
        const card = document.createElement("div");
        card.className = "card mb-3";

        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${post.titulo}</h5>
                <p class="card-text">${post.descripcion}</p>
                ${post.imagen_url ? `<img src="${post.imagen_url}" class="img-fluid mb-2">` : ""}
                <p class="text-muted">Publicado por ${post.users?.nombre || "Anónimo"}</p>

                ${
                    user && user.id !== post.user_id
                        ? `<button class="btn btn-sm btn-primary solicitar-btn" data-id="${post.id}">
                            Solicitar Intercambio
                           </button>`
                        : ""
                }

                <div class="mt-3 solicitudes">
                    <h6>Solicitudes de intercambio:</h6>
                    ${
                        solicitudes?.length > 0
                            ? solicitudes
                                  .map(
                                      (s) => `
                            <div class="d-flex justify-content-between align-items-center border p-2 mb-1">
                                <span>
                                    ${s.solicitante?.nombre || "Desconocido"} - Estado: ${s.estado}
                                </span>
                                ${
                                    user && user.id === post.user_id && s.estado === "pendiente"
                                        ? `
                                    <div>
                                        <button class="btn btn-sm btn-success aceptar-btn" data-id="${s.id}">Aceptar</button>
                                        <button class="btn btn-sm btn-danger rechazar-btn" data-id="${s.id}">Rechazar</button>
                                    </div>
                                    `
                                        : ""
                                }
                            </div>
                        `
                                  )
                                  .join("")
                            : "<p class='text-muted'>No hay solicitudes de intercambio</p>"
                    }
                </div>
            </div>
        `;

        feed.appendChild(card);
    }

    // Eventos de solicitar intercambio
    document.querySelectorAll(".solicitar-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const postId = e.target.dataset.id;

            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) {
                alert("Debes iniciar sesión para solicitar un intercambio.");
                return;
            }

            const { error } = await supabase.from("intercambios").insert([
                { post_id: postId, solicitante_id: user.id, estado: "pendiente" }
            ]);

            if (error) {
                console.error("Error solicitando intercambio:", error);
                alert("No se pudo solicitar el intercambio.");
                return;
            }

            // Refrescar publicaciones
            renderPosts();
        });
    });

    // Eventos de aceptar/rechazar intercambio
    document.querySelectorAll(".aceptar-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.dataset.id;

            const { error } = await supabase
                .from("intercambios")
                .update({ estado: "aceptado" })
                .eq("id", id);

            if (error) {
                console.error("Error aceptando intercambio:", error);
                alert("No se pudo aceptar el intercambio.");
                return;
            }

            renderPosts();
        });
    });

    document.querySelectorAll(".rechazar-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.dataset.id;

            const { error } = await supabase
                .from("intercambios")
                .update({ estado: "rechazado" })
                .eq("id", id);

            if (error) {
                console.error("Error rechazando intercambio:", error);
                alert("No se pudo rechazar el intercambio.");
                return;
            }

            renderPosts();
        });
    });
}

// Escuchar cambios en autenticación y cargar posts
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        renderPosts();
    } else {
        window.location.href = "index.html"; // Redirigir si no hay sesión
    }
});

// Primera carga
renderPosts();
