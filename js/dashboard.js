import { supabase } from "./supabaseClient.js";

// Elementos del DOM
const formPublicacion = document.getElementById("formPublicacion");
const feedContainer = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

// Chat modal
const chatModal = new bootstrap.Modal(document.getElementById("chatModal"));
const mensajesModal = document.getElementById("mensajesModal");
const inputMensajeModal = document.getElementById("inputMensajeModal");
const enviarMensajeModalBtn = document.getElementById("enviarMensajeModalBtn");

// Usuario actual
let currentUserId = null;
let currentChatId = null;

// --- SESIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error al obtener sesión:", error);
    return;
  }
  console.log("Sesión activa:", session);
  if (session) {
    currentUserId = session.user.id;
    console.log("Usuario autenticado ID:", currentUserId);
    cargarPublicaciones();
  }
});

// --- LOGOUT ---
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// --- PUBLICAR PRODUCTO ---
formPublicacion.addEventListener("submit", async (e) => {
  e.preventDefault();
  const producto = document.getElementById("producto").value;
  const cantidad = document.getElementById("cantidad").value;
  const unidad = document.getElementById("unidad").value;
  const productoDeseado = document.getElementById("productoDeseado").value;
  const cantidadDeseada = document.getElementById("cantidadDeseada").value;
  const unidadDeseada = document.getElementById("unidadDeseada").value;

  const { error } = await supabase.from("publicaciones").insert([
    {
      producto,
      cantidad,
      unidad,
      producto_deseado: productoDeseado,
      cantidad_deseada: cantidadDeseada,
      unidad_deseada: unidadDeseada,
      user_id: currentUserId
    }
  ]);

  if (error) console.error("Error al publicar:", error);
  else {
    formPublicacion.reset();
    cargarPublicaciones();
  }
});

// --- CARGAR PUBLICACIONES ---
async function cargarPublicaciones() {
  feedContainer.innerHTML = "";
  const { data, error } = await supabase.from("publicaciones").select(`
    id, producto, cantidad, unidad, producto_deseado, cantidad_deseada, unidad_deseada,
    user_id, profiles ( full_name )
  `);

  if (error) {
    console.error("Error al cargar publicaciones:", error);
    return;
  }

  data.forEach(pub => {
    const card = document.createElement("div");
    card.classList.add("card", "shadow", "p-3", "mb-3");

    const nombre = pub.profiles?.full_name || "Anónimo";

    card.innerHTML = `
      <h5>${pub.producto} (${pub.cantidad} ${pub.unidad})</h5>
      <p><strong>Desea:</strong> ${pub.cantidad_deseada} ${pub.unidad_deseada} de ${pub.producto_deseado}</p>
      <p><em>Publicado por: ${nombre}</em></p>
      <button class="btn btn-sm btn-primary me-2" onclick="aceptarIntercambio(${pub.id})">Aceptar</button>
      <button class="btn btn-sm btn-danger">Rechazar</button>
    `;

    feedContainer.appendChild(card);
  });
}

// --- ACEPTAR INTERCAMBIO ---
window.aceptarIntercambio = async (publicacionId) => {
  // Crear intercambio
  const { data: intercambio, error } = await supabase.from("intercambios").insert([
    {
      user_id: currentUserId,
      publicacion_id: publicacionId,
      estado: "aceptado"
    }
  ]).select().single();

  if (error) {
    console.error("Error creando intercambio:", error);
    return;
  }

  // Crear chat asociado
  const { data: chat, error: chatError } = await supabase.from("chats").insert([
    { intercambio_id: intercambio.id }
  ]).select().single();

  if (chatError) {
    console.error("Error creando chat:", chatError);
    return;
  }

  // Abrir modal de chat
  abrirChat(chat.id);
};

// --- ABRIR CHAT ---
async function abrirChat(chatId) {
  currentChatId = chatId;
  mensajesModal.innerHTML = "";

  const { data: mensajes, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando mensajes:", error);
    return;
  }

  mensajes.forEach(msg => {
    const p = document.createElement("p");
    p.textContent = `${msg.remitente}: ${msg.contenido}`;
    mensajesModal.appendChild(p);
  });

  chatModal.show();
}

// --- ENVIAR MENSAJE ---
enviarMensajeModalBtn.addEventListener("click", async () => {
  if (!currentChatId) return;

  const contenido = inputMensajeModal.value.trim();
  if (contenido === "") return;

  const { error } = await supabase.from("mensajes").insert([
    {
      chat_id: currentChatId,
      remitente: currentUserId,
      contenido
    }
  ]);

  if (error) {
    console.error("Error enviando mensaje:", error);
    return;
  }

  inputMensajeModal.value = "";
  abrirChat(currentChatId);
});
