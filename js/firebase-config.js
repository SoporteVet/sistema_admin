// ============================================================
// FIREBASE-CONFIG.JS - Configuración de Firebase
// Veterinaria San Martín de Porres
// ============================================================
// ⚠️ IMPORTANTE: Reemplaza estos valores con los de tu proyecto Firebase
// Ve a: https://console.firebase.google.com > Tu proyecto > Configuración del proyecto
// ============================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCHnp-pVeokbf6wQndnD3R3gGYLgMuPm-w",
    authDomain: "sistema-administrativo-36a03.firebaseapp.com",
    databaseURL: "https://sistema-administrativo-36a03-default-rtdb.firebaseio.com",
    projectId: "sistema-administrativo-36a03",
    storageBucket: "sistema-administrativo-36a03.firebasestorage.app",
    messagingSenderId: "423205416173",
    appId: "1:423205416173:web:70897097213a8bf658b0e4",
    measurementId: "G-4PF81YWFD7"
  };

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const db = firebase.database();

// Referencia raíz de la base de datos
const dbRef = {
    users: db.ref('users'),
    documents: db.ref('documents'),
    requests: db.ref('requests'),
    notifications: db.ref('notifications'),
    counters: db.ref('counters'),
    departamentos: db.ref('departamentos')
};

console.log('🔥 Firebase inicializado correctamente');
