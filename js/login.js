document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // --- LOGIN ---
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
    } else {
      alert("Bienvenido 🎉");
      console.log("Usuario logeado:", data.user);

      // Redirigir a dashboard
      window.location.href = "dashboard.html";
    }
  });

  // --- REGISTRO ---
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    // 1. Crear usuario en auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Error al registrarse: " + error.message);
      return;
    }

    // 2. Guardar datos extra en tabla students
    const { error: insertError } = await supabase
      .from("students")
      .insert([{ id: data.user.id, name, email }]);

    if (insertError) {
      alert("Error al guardar datos del estudiante: " + insertError.message);
    } else {
      alert("Cuenta creada con éxito 🎉");
      // 🚀 Redirigir automáticamente después de registrarse
      window.location.href = "dashboard.html";
    }
  });
});
