require('dotenv').config();

console.log('Testing environment variables:');
console.log('ALCHEMY_API_KEY:', process.env.ALCHEMY_API_KEY ? '✓ Set' : '✗ Not set');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✓ Set' : '✗ Not set');
console.log('ETHERSCAN_API_KEY:', process.env.ETHERSCAN_API_KEY ? '✓ Set' : '✗ Not set'); 