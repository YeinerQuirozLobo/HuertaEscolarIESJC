import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Verificar sesión al cargar la página
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

// Manejar cierre de sesión
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Debes iniciar sesión para publicar un producto.");
            return;
        }
        const user = session.user;

        const producto = document.getElementById("producto").value;
        const cantidad = document.getElementById("cantidad").value;
        const unidad = document.getElementById("unidad").value;
        const productoDeseado = document.getElementById("productoDeseado").value;
        const cantidadDeseada = document.getElementById("cantidadDeseada").value;
        const unidadDeseada = document.getElementById("unidadDeseada").value;
        const mensaje = `${producto} ${cantidad} ${unidad}, cambio por ${productoDeseado} ${cantidadDeseada} ${unidadDeseada}`;
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

                // URL pública
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
                        mensaje,
                        estado: "activo",
                        imagen_url
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

// Función para eliminar publicación
async function eliminarPublicacion(pubId) {
    const confirmDelete = confirm("¿Seguro que quieres eliminar esta publicación?");
    if (!confirmDelete) return;

    try {
        const { error } = await supabase
            .from("publicaciones")
            .delete()
            .eq("id", pubId);
        if (error) throw error;

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al eliminar:", err.message);
        alert("No se pudo eliminar la publicación.");
    }
}

// Función para realizar intercambio
async function aceptarIntercambio(pubId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("Debes iniciar sesión para aceptar un intercambio.");
        return;
    }
    const user = session.user;

    try {
        const { error } = await supabase
            .from("intercambios")
            .insert([
                {
                    publicacion_id: pubId,
                    user_id: user.id,
                    estado: "pendiente"
                }
            ]);
        if (error) throw error;

        await cargarPublicaciones();
    } catch (err) {
        console.error("❌ Error al aceptar intercambio:", err.message);
        alert("No se pudo aceptar el intercambio.");
    }
}

// Cargar y mostrar publicaciones
async function cargarPublicaciones() {
    feedContainer.innerHTML = "<p class='text-center'>Cargando publicaciones...</p>";

    try {
        const { data, error } = await supabase
            .from("publicaciones")
            .select(`
                *,
                profiles(full_name),
                intercambios(user_id)
            `)
            .order("id", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            feedContainer.innerHTML = "<p class='text-center'>No hay publicaciones aún.</p>";
            return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user.id;

        const htmlCards = data.map(pub => {
            const authorName = pub.profiles ? pub.profiles.full_name : "Usuario Desconocido";
            const esAutor = userId === pub.user_id;
            const intercambiosHtml = pub.intercambios?.length
                ? pub.intercambios.map(i => `<li>Usuario ID: ${i.user_id}</li>`).join("")
                : "<li>No hay intercambios aún</li>";

            return `
                <div class="card mb-3 shadow">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${pub.imagen_url || "https://via.placeholder.com/150"}" 
                                 class="img-fluid rounded-start h-100 object-fit-cover" 
                                 alt="Imagen de la publicación">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <p class="card-text">${pub.mensaje}</p>
                                <p class="card-text"><small class="text-muted">Publicado por: ${authorName}</small></p>
                                
                                ${esAutor ? `<button class="btn btn-danger btn-sm mb-2" onclick="eliminarPublicacion(${pub.id})">Eliminar</button>` : ""}
                                
                                <button class="btn btn-success btn-sm mb-2" onclick="aceptarIntercambio(${pub.id})">Aceptar Intercambio</button>
                                <ul>
                                    ${intercambiosHtml}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        feedContainer.innerHTML = htmlCards;
    } catch (err) {
        console.error("❌ Error al cargar publicaciones:", err.message);
        feedContainer.innerHTML = "<p class='text-danger text-center'>Error al cargar publicaciones.</p>";
    }
}

// Exponer funciones al scope global para botones inline
window.eliminarPublicacion = eliminarPublicacion;
window.aceptarIntercambio = aceptarIntercambio;
