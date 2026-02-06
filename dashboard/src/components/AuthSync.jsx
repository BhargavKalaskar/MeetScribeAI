import { useEffect } from 'react';
import { getAuth, onIdTokenChanged } from 'firebase/auth'; 
import Cookies from 'js-cookie';

const AuthSync = () => {
  useEffect(() => {
    const auth = getAuth();

    // This listener runs whenever the user Logs In, Logs Out, or the Token Refreshes
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        // 1. User is Logged In: Get the specific token
        const token = await user.getIdToken();
        
        // 2. Save it as a Cookie named 'meetscribe_token'
        // This is what the Extension is searching for!
        Cookies.set('meetscribe_token', token, { 
            expires: 7, // Keeps them logged in for 7 days
            path: '/',
            sameSite: 'Lax' 
        });
        
        console.log("✅ [AuthSync] Firebase Token saved to Cookie!");
      } else {
        // 3. User Logged Out: Delete the cookie
        Cookies.remove('meetscribe_token');
        console.log("❌ [AuthSync] User logged out, Cookie removed.");
      }
    });

    // Cleanup when component unmounts
    return () => unsubscribe();
  }, []);

  // This component doesn't show anything on screen
  return null;
};

export default AuthSync;