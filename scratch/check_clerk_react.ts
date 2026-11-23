import * as clerkReact from '@clerk/react';

console.log('Clerk React exports:', Object.keys(clerkReact).slice(0, 30));
console.log('Has ClerkProvider:', 'ClerkProvider' in clerkReact);
console.log('Has useUser:', 'useUser' in clerkReact);
console.log('Has useAuth:', 'useAuth' in clerkReact);
console.log('Has useClerk:', 'useClerk' in clerkReact);
console.log('Has SignIn:', 'SignIn' in clerkReact);
console.log('Has SignUp:', 'SignUp' in clerkReact);
console.log('Has UserButton:', 'UserButton' in clerkReact);
console.log('Has SignedIn:', 'SignedIn' in clerkReact);
console.log('Has SignedOut:', 'SignedOut' in clerkReact);
