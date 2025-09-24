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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          redirectTo: 'https://yeinerquirozlobo.github.io/HuertaEscolarIESJC/dashboard.html'
        },
      });

      if (error) {
        alert("❌ Error al registrarse: " + error.message);
      } else {
        alert("✅ Cuenta creada, revisa tu correo para confirmar");
        console.log("Usuario registrado:", data);
      }
    });
  }
});