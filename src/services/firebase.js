import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi dari screenshot Firebase Anda (omnipos-3905a)
const firebaseConfig = {
  apiKey: "AIzaSyD7j0Km1CAXKsC9qDZo2QDlhsGI2kQ0lFM",
  authDomain: "omnipos-3905a.firebaseapp.com",
  projectId: "omnipos-3905a",
  storageBucket: "omnipos-3905a.firebasestorage.app",
  messagingSenderId: "697643971180",
  appId: "1:697643971180:web:b12b9df053abf29f031e49"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);