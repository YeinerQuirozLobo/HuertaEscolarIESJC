import { supabase } from "./supabaseClient.js";

// Referencias a elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");
const chatContainer = document.getElementById("chatContainer");
const chatBox = document.getElementById("chatBox");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

let usuarioId = null;
let chatActivo = null;

// ====================== AUTENTICACIÓN ======================
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log("Sesión activa:", session);
    usuarioId = session.user.id;
    console.log("Usuario autenticado ID:", usuarioId);
    cargarFeed();
  } else {
    window.location.href = "index.html"; // Redirige si no hay sesión
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ====================== PUBLICAR ======================
if (formPublicacion) {
  formPublicacion.addEventListener("submit", async (e) => {
    e.preventDefault();
    const contenido = document.getElementById("contenido").value;

    if (!contenido.trim()) return;

    const { error } = await supabase
      .from("publicaciones")
      .insert([{ contenido, usuario_id: usuarioId }]);

    if (error) {
      console.error("Error al publicar:", error);
    } else {
      formPublicacion.reset();
      cargarFeed();
    }
  });
}

// ====================== FEED ======================
async function cargarFeed() {
  const { data, error } = await supabase
    .from("publicaciones")
    .select("id, contenido, usuario_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando publicaciones:", error);
    return;
  }

  feedContainer.innerHTML = "";

  data.forEach((pub) => {
    const div = document.createElement("div");
    div.className = "card mb-2 p-2";

    div.innerHTML = `
      <p>${pub.contenido}</p>
      <button class="btn btn-sm btn-primary" onclick="solicitarIntercambio('${pub.id}', '${pub.usuario_id}')">Solicitar intercambio</button>
      <button class="btn btn-sm btn-success" onclick="abrirChat('${pub.usuario_id}', '${pub.id}')">Abrir Chat</button>
      <div id="solicitudes-${pub.id}" class="mt-2"></div>
    `;

    feedContainer.appendChild(div);

    cargarSolicitudes(pub.id);
  });
}

// ====================== SOLICITUDES ======================
async function solicitarIntercambio(publicacionId, propietarioId) {
  if (propietarioId === usuarioId) {
    alert("No puedes solicitar intercambio a tu propia publicación.");
    return;
  }

  const { error } = await supabase.from("intercambios").insert([
    {
      publicacion_id: publicacionId,
      solicitante_id: usuarioId,
      propietario_id: propietarioId,
      estado: "pendiente",
    },
  ]);

  if (error) {
    console.error("Error al solicitar intercambio:", error);
  } else {
    alert("Solicitud enviada");
    cargarSolicitudes(publicacionId);
  }
}

async function cargarSolicitudes(publicacionId) {
  const { data, error } = await supabase
    .from("intercambios")
    .select("id, solicitante_id, estado")
    .eq("publicacion_id", publicacionId);

  if (error) {
    console.error("Error al cargar solicitudes:", error);
    return;
  }

  const contenedor = document.getElementById(`solicitudes-${publicacionId}`);
  if (!contenedor) return;

  if (data.length === 0) {
    contenedor.innerHTML = "<p class='text-muted'>No hay solicitudes de intercambio.</p>";
    return;
  }

  contenedor.innerHTML = data
    .map(
      (s) => `
      <div class="d-flex justify-content-between align-items-center border p-1 mb-1">
        <span>Solicitante: ${s.solicitante_id}</span>
        <span class="badge bg-info">${s.estado}</span>
      </div>
    `
    )
    .join("");
}

// ====================== CHAT ======================
window.abrirChat = async function (otroUsuarioId, publicacionId) {
  if (!chatContainer || !chatBox) {
    console.error("❌ El contenedor de chat no existe en el HTML.");
    return;
  }

  chatActivo = { otroUsuarioId, publicacionId };
  chatContainer.style.display = "block";
  chatBox.style.display = "block";

  cargarMensajes();

  if (sendMessageBtn) {
    sendMessageBtn.onclick = enviarMensaje;
  }
};

async function cargarMensajes() {
  if (!chatActivo) return;

  const { data, error } = await supabase
    .from("chats")
    .select("id, emisor_id, receptor_id, mensaje, created_at")
    .or(
      `and(emisor_id.eq.${usuarioId},receptor_id.eq.${chatActivo.otroUsuarioId}),and(emisor_id.eq.${chatActivo.otroUsuarioId},receptor_id.eq.${usuarioId})`
    )
    .eq("publicacion_id", chatActivo.publicacionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error al cargar mensajes:", error);
    return;
  }

  chatMessages.innerHTML = "";

  data.forEach((msg) => {
    const p = document.createElement("p");
    p.className = msg.emisor_id === usuarioId ? "text-end text-primary" : "text-start text-dark";
    p.textContent = msg.mensaje;
    chatMessages.appendChild(p);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarMensaje() {
  if (!chatActivo) return;
  const mensaje = chatInput.value.trim();
  if (!mensaje) return;

  const { error } = await supabase.from("chats").insert([
    {
      emisor_id: usuarioId,
      receptor_id: chatActivo.otroUsuarioId,
      mensaje,
      publicacion_id: chatActivo.publicacionId,
    },
  ]);

  if (error) {
    console.error("Error al enviar mensaje:", error);
    return;
  }

  chatInput.value = "";
  cargarMensajes();
}
