// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAR1pHKjfY7UVlPuZwKGoi5MT33FHMqycI",
  authDomain: "meet-transcriber-f8a91.firebaseapp.com",
  projectId: "meet-transcriber-f8a91",
  storageBucket: "meet-transcriber-f8a91.firebasestorage.app",
  messagingSenderId: "777420342728",
  appId: "1:777420342728:web:2811c7af7549d8ee186cfd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);