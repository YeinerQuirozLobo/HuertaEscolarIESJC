// Configuración de Firebase (Firestore solo, sin Storage)
const firebaseConfig = {
  apiKey: "AIzaSyDjK8gm7yhBbX3dv6wwV5fFfoS8CeaZ6u0",
  authDomain: "huerta-escolar-iesjc.firebaseapp.com",
  projectId: "huerta-escolar-iesjc",
  messagingSenderId: "76068797718",
  appId: "1:76068797718:web:5f3e954a06014e5c57a437"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
