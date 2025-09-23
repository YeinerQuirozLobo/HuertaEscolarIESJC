import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- LOGIN ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        alert("⚠️ Debes ingresar correo y contraseña");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("❌ Error al iniciar sesión: " + error.message);
      } else {
        alert("✅ Bienvenido " + email);
        console.log("Usuario logueado:", data);
      }
    });
  }

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
