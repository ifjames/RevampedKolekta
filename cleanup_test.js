// Quick test to clean up any remaining active exchanges manually
// This is for debugging purposes
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupActiveExchanges() {
  try {
    console.log('🧹 Starting manual cleanup of active exchanges...');
    
    // Get all active exchanges
    const activeExchangesSnapshot = await getDocs(collection(db, 'activeExchanges'));
    console.log(`Found ${activeExchangesSnapshot.size} active exchanges`);
    
    // Delete each one
    for (const doc of activeExchangesSnapshot.docs) {
      console.log('Deleting active exchange:', doc.id, doc.data());
      await deleteDoc(doc.ref);
    }
    
    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupActiveExchanges();
}