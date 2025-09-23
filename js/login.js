// login.js
import { supabase } from "./supabaseClient.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("❌ Error: " + error.message);
  } else {
    alert("✅ Login exitoso, redirigiendo...");
    window.location.href = "dashboard.html";
  }
});
