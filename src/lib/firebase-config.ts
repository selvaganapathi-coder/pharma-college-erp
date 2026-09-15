/** Public Firebase web config for project pharmacy-98684. Env vars override these if set. */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAIxYdUsX0O6_FpgY8LjzFaaZjJqYUVCA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pharmacy-98684.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pharmacy-98684",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pharmacy-98684.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "16917835929",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:16917835929:web:4e6078c9d10bb88720c808",
};
