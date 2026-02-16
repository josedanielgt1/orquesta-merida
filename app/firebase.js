// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKzltI0yVWhCEfm-okVqtoVKNbUhSujxc",
  authDomain: "orquesta-merida.firebaseapp.com",
  projectId: "orquesta-merida",
  storageBucket: "orquesta-merida.firebasestorage.app",
  messagingSenderId: "616342020162",
  appId: "1:616342020162:web:ce6e809a9bb95315060ddb",
  measurementId: "G-61JPKPZLB3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

