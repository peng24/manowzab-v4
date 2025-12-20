import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAVYqEmdw-AwS1tCElhSaXDLP1Aq35chp0",
  authDomain: "manowlive-chat.firebaseapp.com",
  databaseURL:
    "https://manowlive-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "manowlive-chat",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
