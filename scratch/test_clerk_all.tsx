import { useSignIn, useSignUp } from '@clerk/clerk-react';

export function Test() {
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp || !setActiveSignIn || !setActiveSignUp) return null;

  async function testAll() {
    // 1. Sign in
    const signInRes = await signIn.create({ identifier: 'test@example.com', password: 'password123' });
    if (signInRes.status === 'complete') {
      await setActiveSignIn({ session: signInRes.createdSessionId });
    }

    // 2. Sign up
    const signUpRes = await signUp.create({ emailAddress: 'test@example.com', password: 'password123', firstName: 'John' });
    if (signUpRes.status === 'complete') {
      await setActiveSignUp({ session: signUpRes.createdSessionId });
    } else if (signUpRes.status === 'missing_requirements') {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      await signUp.attemptEmailAddressVerification({ code: '123456' });
    }

    // 3. OAuth Google
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/'
    });

    // 4. Password reset
    await signIn.create({
      strategy: 'reset_password_email_code',
      identifier: 'test@example.com'
    });
  }
}
