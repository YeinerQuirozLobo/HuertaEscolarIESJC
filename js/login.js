import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
  
 // --- LOGIN ---
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  // Usamos redirectTo para que Supabase maneje la redirección y la sesión
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      redirectTo: 'https://yeinerquirozlobo.github.io/HuertaEscolarIESJC/dashboard.html'
    }
  });

  if (error) {
    alert("❌ Error al iniciar sesión: " + error.message);
    console.error(error);
  } else {
    alert("✅ Inicio de sesión exitoso");
    console.log("Sesión:", data);
    // La redirección ahora es manejada por Supabase
  }
});

  // --- REGISTRO ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;

      if (!name || !email || !password) {
        alert("⚠️ Todos los campos son obligatorios");
        return;
      }

// ... dentro de la función de inicio de sesión
const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
        // Asegúrate de que esta URL sea la de tu dashboard
        redirectTo: 'http://127.0.0.1:5500/dashboard.html'
    }
});

if (error) {
    // ... manejo de errores
} else {
    alert("✅ Inicio de sesión exitoso");
    console.log("Sesión:", data);
    // Supabase maneja la redirección aquí, no necesitas window.location.href
}