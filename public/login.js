const auth = firebase.auth();

// -------------------- LOGIN --------------------
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "intercambio.html"; // Ir a zona de intercambio
    })
    .catch(err => alert("❌ Error: " + err.message));
});

// -------------------- REGISTRO --------------------
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      return userCredential.user.updateProfile({
        displayName: name
      });
    })
    .then(() => {
      alert("✅ Registro exitoso. Bienvenido!");
      window.location.href = "intercambio.html";
    })
    .catch(err => alert("❌ Error: " + err.message));
});

