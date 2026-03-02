import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { getFirebaseServices } from './firebase';

export const signInWithGoogle = async () => {
  const { auth } = getFirebaseServices();
  const provider = new GoogleAuthProvider();
  try {
    await signInWithRedirect(auth, provider);
    // The page will redirect to Google, then back to the app
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};
