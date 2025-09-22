// login.js

// ✅ Inicialización de Supabase
const SUPABASE_URL = "https://TU_PROJECT_URL.supabase.co"; 
const SUPABASE_ANON_KEY = "TU_ANON_KEY"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ Capturar el formulario
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Validar que no estén vacíos
  if (!email || !password) {
    loginMessage.textContent = "⚠️ Ingresa tu correo y contraseña.";
    loginMessage.style.color = "red";
    return;
  }

  // ✅ Login con Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    loginMessage.textContent = `❌ Error: ${error.message}`;
    loginMessage.style.color = "red";
  } else {
    loginMessage.textContent = "✅ Login exitoso, redirigiendo...";
    loginMessage.style.color = "green";

    // Guardar sesión en localStorage (opcional)
    localStorage.setItem("supabaseSession", JSON.stringify(data));

    // Redirigir al dashboard
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  }
});
