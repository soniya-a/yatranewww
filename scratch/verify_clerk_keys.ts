import 'dotenv/config';

async function checkKeyOwner() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.log('CLERK_SECRET_KEY is not set');
    return;
  }

  try {
    const res = await fetch('https://api.clerk.com/v1/instance', {
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    if (!res.ok) {
      console.log(`Clerk API returned status: ${res.status} ${res.statusText}`);
      return;
    }

    const data = await res.json();
    console.log('=== Backend Secret Key Metadata from Clerk API ===');
    console.log('Instance ID:', data.id);
    console.log('Environment Type:', data.environment_type);
    console.log('Instance Name / Slug:', data.name || data.slug || data.home_origin);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

checkKeyOwner();
