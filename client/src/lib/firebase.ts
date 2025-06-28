import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAA4LccJfaBn_7zMefCxN7Zw2PR0-J4TGw",
  authDomain: "projectkolekta.firebaseapp.com",
  projectId: "projectkolekta",
  storageBucket: "projectkolekta.firebasestorage.app",
  messagingSenderId: "158152413445",
  appId: "1:158152413445:web:d3a932b4946d72497c276c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export Firestore functions
export { doc, getDoc };

// Initialize messaging conditionally
export let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export default app;
