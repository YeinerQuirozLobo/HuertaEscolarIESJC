// Aseguramos que supabase esté cargado
if (!window.supabase) {
  console.error("❌ Supabase no está definido. Revisa que el script de configuración esté antes de este archivo.");
}

// Referencia al cliente global
const supabase = window.supabase;

// ------------------------------
// LOGIN
// ------------------------------
async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("❌ Error al iniciar sesión:", error.message);
      alert("Error: " + error.message);
      return null;
    }

    console.log("✅ Usuario logueado:", data);
    alert("Bienvenido " + email);
    return data;
  } catch (err) {
    console.error("⚠️ Excepción en login:", err);
  }
}

// ------------------------------
// SIGN UP
// ------------------------------
async function registerUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error("❌ Error al registrar:", error.message);
      alert("Error: " + error.message);
      return null;
    }

    console.log("✅ Usuario registrado:", data);
    alert("Usuario registrado: " + email);
    return data;
  } catch (err) {
    console.error("⚠️ Excepción en registro:", err);
  }
}

// ------------------------------
// EVENTOS (ejemplo con botones en HTML)
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("btnLogin");
  const registerBtn = document.getElementById("btnRegister");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      await loginUser(email, password);
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      await registerUser(email, password);
    });
  }
});
