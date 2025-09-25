import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// 1. Verificar la sesión del usuario al cargar la página
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

// 2. Manejar el cierre de sesión
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// 3. Manejar el formulario de publicación
if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Debes iniciar sesión para publicar un producto.");
            return;
        }
        const user = session.user;

        // Datos del formulario
        const producto = document.getElementById("producto").value;
        const cantidad = document.getElementById("cantidad").value;
        const unidad = document.getElementById("unidad").value;
        const productoDeseado = document.getElementById("productoDeseado").value;
        const cantidadDeseada = document.getElementById("cantidadDeseada").value;
        const unidadDeseada = document.getElementById("unidadDeseada").value;
        const mensaje = document.getElementById("mensaje").value || "";
        const imagenFile = document.getElementById("imagen").files[0];

        try {
            // Subir imagen al bucket "productos"
            let imagen_url = null;
            if (imagenFile) {
                const fileName = `${Date.now()}-${user.id}-${imagenFile.name}`;
                const { data: imgData, error: imgError } = await supabase.storage
                    .from("productos")
                    .upload(fileName, imagenFile);

                if (imgError) throw imgError;

                // Obtener URL pública
                const { data: urlData } = supabase.storage
                    .from("productos")
                    .getPublicUrl(imgData.path);

                imagen_url = urlData.publicUrl;
            }

            // Insertar publicación
            const { error } = await supabase
                .from("publicaciones")
                .insert([
                    {
                        user_id: user.id,
                        producto,
                        cantidad,
                        unidad,
                        imagen_url,
                        producto_deseado: productoDeseado,
                        cantidad_deseada: cantidadDeseada,
                        unidad_deseada: unidadDeseada,
                        mensaje
                    }
                ]);

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

// 4. Cargar y mostrar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    const { data, error } = await supabase
        .from("publicaciones")
        .select(`
            *,
            profiles(full_name)
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("❌ Error al cargar publicaciones:", error.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
        return;
    }

    if (!data || data.length === 0) {
        feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
        return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    const htmlCards = await Promise.all(data.map(async pub => {
        const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";

        // Obtener intercambios aceptados para la publicación
        const { data: intercambios } = await supabase
            .from("intercambios")
            .select(`
                *,
                profiles(full_name)
            `)
            .eq("publicacion_id", pub.id);

        // Obtener comentarios de la publicación
        const { data: comentarios } = await supabase
            .from("comentarios")
            .select(`
                *,
                profiles(full_name)
            `)
            .eq("publicacion_id", pub.id)
            .order("id", { ascending: true });

        // HTML de comentarios
        const htmlComentarios = comentarios?.map(c => `<p><strong>${c.profiles?.full_name || "Anon"}:</strong> ${c.mensaje}</p>`).join("") || "<p class='text-muted'>No hay comentarios aún.</p>";

        // HTML de intercambios
        const htmlIntercambios = intercambios?.map(i => `<p>${i.profiles?.full_name || "Anon"} aceptó el intercambio</p>`).join("") || "<p class='text-muted'>No hay intercambios aceptados aún.</p>";

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
                            <p class="card-text">${pub.mensaje || ""}</p>
                            <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>

                            ${userId === pub.user_id ? `<button class="btn btn-danger mb-2 btnEliminar" data-id="${pub.id}">Eliminar publicación</button>` : ""}
                            
                            <button class="btn btn-success mb-2 btnAceptar" data-id="${pub.id}">Aceptar intercambio</button>

                            <div class="mt-2">
                                <h6>Intercambios:</h6>
                                <div>${htmlIntercambios}</div>
                            </div>

                            <div class="mt-2">
                                <h6>Comentarios:</h6>
                                <div id="comentarios-${pub.id}">${htmlComentarios}</div>
                                <form class="mt-2 formComentario" data-id="${pub.id}">
                                    <input type="text" class="form-control mb-1" placeholder="Escribe un comentario..." required>
                                    <button type="submit" class="btn btn-primary btn-sm w-100">Comentar</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }));

    feedContainer.innerHTML = htmlCards.join("");

    // Agregar listeners de eliminar
    document.querySelectorAll(".btnEliminar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const pubId = btn.getAttribute("data-id");
            if (confirm("¿Seguro deseas eliminar esta publicación?")) {
                await supabase.from("publicaciones").delete().eq("id", pubId);
                await cargarPublicaciones();
            }
        });
    });

    // Agregar listeners de aceptar intercambio
    document.querySelectorAll(".btnAceptar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const pubId = btn.getAttribute("data-id");
            const { data: { session } } = await supabase.auth.getSession();
            const user = session.user;

            await supabase.from("intercambios").insert([
                { publicacion_id: pubId, user_id: user.id }
            ]);
            await cargarPublicaciones();
        });
    });

    // Agregar listeners de comentarios
    document.querySelectorAll(".formComentario").forEach(form => {
        form.addEventListener("submit", async e => {
            e.preventDefault();
            const pubId = form.getAttribute("data-id");
            const input = form.querySelector("input");
            const mensaje = input.value.trim();
            if (!mensaje) return;

            const { data: { session } } = await supabase.auth.getSession();
            const user = session.user;

            await supabase.from("comentarios").insert([
                { publicacion_id: pubId, user_id: user.id, mensaje }
            ]);

            input.value = "";
            await cargarPublicaciones();
        });
    });
}
