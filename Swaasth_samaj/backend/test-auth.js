const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Test registration
    const user = await User.create({
      name: 'Test',
      email: 'Test@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('Created user password hash:', user.password);
    
    // Test login
    const foundUser = await User.findOne({ email: 'Test@example.com' });
    if (!foundUser) {
      console.log('User not found during login with case issue');
    } else {
      console.log('User found during login');
      const match = await foundUser.matchPassword('password123');
      console.log('Password match:', match);
    }
    
    const foundUserLowerCase = await User.findOne({ email: 'test@example.com' });
    console.log('User found with lowercase:', !!foundUserLowerCase);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
