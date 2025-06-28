import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Clean up incorrect verification status in posts
export async function cleanupVerificationStatus() {
  try {
    // Get all posts with userInfo.verified = true
    const postsQuery = query(collection(db, 'posts'));
    const postsSnapshot = await getDocs(postsQuery);
    
    const updates: Promise<void>[] = [];
    
    postsSnapshot.forEach((postDoc) => {
      const data = postDoc.data();
      if (data.userInfo?.verified === true) {
        // Update to remove incorrect verification status
        const updatePromise = updateDoc(doc(db, 'posts', postDoc.id), {
          'userInfo.verified': false,
          'userInfo.rating': data.userInfo.rating || 0,
          'userInfo.completedExchanges': data.userInfo.completedExchanges || 0
        });
        updates.push(updatePromise);
      }
    });
    
    await Promise.all(updates);
    console.log('Cleaned up verification status for posts');
  } catch (error) {
    console.error('Error cleaning up verification status:', error);
  }
}

// Function to check actual user verification status
export async function getUserVerificationStatus(userId: string): Promise<boolean> {
  try {
    const userProfileQuery = query(
      collection(db, 'userProfiles'), 
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(userProfileQuery);
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return userData.verified === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
}