import fs from 'fs';
import { createClerkClient } from '@clerk/backend';

const env = fs.readFileSync('D:/YATRA/Yatranew/.env', 'utf8');
let secKey = '';
env.split('\n').forEach(l => {
  if (l.startsWith('CLERK_SECRET_KEY=')) secKey = l.split('=')[1].trim();
});

const clerk = createClerkClient({ secretKey: secKey });

async function verifyClerk() {
  console.log('Testing Clerk API connection with backend secret key...');
  try {
    const userList = await clerk.users.getUserList({ limit: 10 });
    console.log('Clerk API Success! Total users found in dashboard:', userList.totalCount);
    console.log('Users returned:', userList.data.map(u => ({
      id: u.id,
      email: u.emailAddresses?.map(e => e.emailAddress),
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: new Date(u.createdAt).toISOString()
    })));
  } catch (err: any) {
    console.error('Clerk API call failed:', err.message);
    if (err.errors) console.error('Error details:', err.errors);
  }
}

verifyClerk();
