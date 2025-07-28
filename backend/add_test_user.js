const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('dvpn.db');

const testUser = {
  address: '0xBD851D49cE0922D98Cc2029844CA78B66Cc33D8c',
  ipAddress: '35.246.119.40',
  owner: '0xBD851D49cE0922D98Cc2029844CA78B66Cc33D8c',
  friendlyName: 'Test Node',
  country: 'US',
  status: 'approved'
};

db.run(
  'INSERT OR REPLACE INTO pending_nodes (address, ip_address, owner, friendly_name, country, status) VALUES (?, ?, ?, ?, ?, ?)',
  [testUser.address, testUser.ipAddress, testUser.owner, testUser.friendlyName, testUser.country, testUser.status],
  function(err) {
    if (err) {
      console.error('Error adding test user:', err);
      process.exit(1);
    }
    console.log('Test user added successfully');
    process.exit(0);
  }
); 