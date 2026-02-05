const bcrypt = require('bcrypt');

async function generatePasswordHash() {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Password: password123');
    console.log('Bcrypt hash:');
    console.log(hash);
}

generatePasswordHash().catch(console.error);
