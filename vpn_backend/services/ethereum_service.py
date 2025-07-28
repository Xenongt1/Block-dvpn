from web3 import Web3
import os
import json

class EthereumService:
    def __init__(self):
        # Initialize Web3 with Sepolia provider
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('ETH_RPC_URL')))
        
        # Load contract ABI and address
        self.contract_address = os.getenv('SUBSCRIPTION_CONTRACT_ADDRESS')
        with open('contracts/Subscription.json') as f:
            contract_json = json.load(f)
            self.contract_abi = contract_json['abi']
        
        # Initialize contract
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=self.contract_abi
        )

    def verify_subscription(self, user_address):
        """Verify if user has an active subscription"""
        try:
            # Call your existing subscription check function
            has_subscription = self.contract.functions.hasActiveSubscription(
                user_address
            ).call()
            
            return has_subscription
        except Exception as e:
            raise Exception(f"Failed to verify subscription: {str(e)}")

    def get_subscription_details(self, user_address):
        """Get detailed subscription information"""
        try:
            # Call your existing function to get subscription details
            details = self.contract.functions.getSubscriptionDetails(
                user_address
            ).call()
            
            return {
                'is_active': details[0],
                'expiration': details[1],
                'plan_type': details[2]
            }
        except Exception as e:
            raise Exception(f"Failed to get subscription details: {str(e)}") 