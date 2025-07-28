import sys
sys.path.append('/root/vpn-node/src')

from web3_utils import check_subscription

test_address = "0xBD851D49cE0922D98Cc2029844CA78B66Cc33D8c"
result = check_subscription(test_address)
print(f"Subscription status for {test_address}: {'Active' if result else 'Inactive'}") 