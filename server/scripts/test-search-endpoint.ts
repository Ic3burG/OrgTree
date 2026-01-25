import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Configuration
const ORG_ID = '7614b3e4-ed69-489b-a76c-628d999a7a44';
const USER_ID = '3e5e2577-4540-4705-bc77-491c9102546a'; // ojdavis@gmail.com
const USER_EMAIL = 'ojdavis@gmail.com';
const USER_ROLE = 'admin';

async function main() {
  console.log('=== TEST SEARCH ENDPOINT ===');
  
  // 1. Generate Token
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in environment');
    process.exit(1);
  }
  
  const token = jwt.sign(
    {
      id: USER_ID,
      email: USER_EMAIL,
      role: USER_ROLE,
      name: 'Test User'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  console.log('✅ Generated JWT Token');

  // 2. Make Request
  const url = `${BASE_URL}/api/organizations/${ORG_ID}/search?q=media&type=departments`;
  console.log(`
Requesting: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // 'X-CSRF-Token': 'skip' // Should not be needed for GET
      }
    });
    
    console.log(`
Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('\nBody:', text);
    console.log('Body Length:', text.length);
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS: Search endpoint works locally');
    } else {
      console.log('\n❌ FAILURE: Search endpoint failed locally');
    }
    
  } catch (error) {
    console.error('\n❌ Error making request:', error);
  }
}

main().catch(console.error);