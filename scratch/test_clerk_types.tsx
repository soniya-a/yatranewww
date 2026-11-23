import { useSignIn, useSignUp } from '@clerk/clerk-react';

function Test() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isUpLoaded, signUp, setActive: setUpActive } = useSignUp();
  if (!isLoaded || !isUpLoaded || !signIn || !signUp || !setActive || !setUpActive) return null;

  async function run() {
    const res = await signIn.create({ identifier: 'test@example.com', password: 'password123' });
    if (res.status === 'complete') {
      await setActive({ session: res.createdSessionId });
    }
  }
}
