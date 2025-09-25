import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Lógica para mostrar/ocultar formularios ---
    const loginCard = document.getElementById("loginForm").parentElement.parentElement;
    const registerCard = document.getElementById("registerCard");
    const showRegisterLink = document.getElementById("showRegister");
    const showLoginLink = document.getElementById("showLogin");

    if (showRegisterLink && registerCard) {
        showRegisterLink.addEventListener("click", (e) => {
            e.preventDefault();
            loginCard.style.display = "none";
            registerCard.style.display = "block";
        });
    }

    if (showLoginLink && loginCard) {
        showLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            registerCard.style.display = "none";
            loginCard.style.display = "block";
        });
    }

    // --- LOGIN ---
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert("❌ Error al iniciar sesión: " + error.message);
            console.error(error);
        } else {
            alert("✅ Inicio de sesión exitoso");
            console.log("Sesión:", data);
            window.location.href = "dashboard.html"; // Redirigir al dashboard
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
                    data: { full_name: name }, // metadata para trigger
                },
            });

            if (error) {
                alert("❌ Error al registrarse: " + error.message);
            } else {
                alert("✅ Cuenta creada, revisa tu correo para confirmar");
                console.log("Usuario registrado:", data);

                // Mostrar login y ocultar registro
                loginCard.style.display = "block";
                registerCard.style.display = "none";

                // Limpiar formulario de registro
                registerForm.reset();
            }
        });
    }
});
