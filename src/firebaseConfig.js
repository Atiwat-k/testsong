import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyCQoVs7-4kquYG1RwsQteN9zF3gBsn7wD8",
  authDomain: "tunejoy-music-c4939.firebaseapp.com",
  projectId: "tunejoy-music-c4939",
  storageBucket: "tunejoy-music-c4939.firebasestorage.app",
  messagingSenderId: "657285105632",
  appId: "1:657285105632:web:b52b6a7370ece576258d85",
  measurementId: "G-MYSPRL96WN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

// ฟังก์ชันอัปโหลดเพลง
async function uploadSong(file, name, artist, category) {
  const storageRef = ref(storage, `songs/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // บันทึกลง Firestore
  await addDoc(collection(db, "songs"), {
    name,
    artist,
    category,
    url
  });

  console.log("Upload complete:", url);
}
