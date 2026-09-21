
const bcrypt = require('bcrypt');

const providedPassword = 'admin20'; // This is what you're sending from Postman
const storedHash = '$2b$10$YobTzz4FjJzJLCZphFtKn6.5vJRP8bcmnpy7gH6K/zxumTWyMbSG.a'; // This is the hash from your image

bcrypt.compare(providedPassword, storedHash, function(err, result) {
    if (err) {
        console.error(err);
        return;
    }
    if (result) {
        console.log('Password matches!');
    } else {
        console.log('Password does NOT match!');
    }
});