const axios = require('axios');

class BlockchainService {
  
  // Verify TRC20 (Tron) Transaction
  async verifyTRC20(txHash, expectedAmount, expectedWallet) {
    try {
      // TronGrid API se transaction details fetch karein
      const response = await axios.get(
        `${process.env.TRONGRID_API}/v1/transactions/${txHash}`
      );

      const data = response.data;
      if (!data.data || data.data.length === 0) {
        return { verified: false, error: 'Transaction not found' };
      }

      const tx = data.data[0];
      
      // Check confirmations
      if (!tx.confirmations || tx.confirmations < 19) {
        return { verified: false, error: 'Transaction not confirmed yet' };
      }

      // Extract contract data
      const contract = tx.raw_data.contract[0];
      if (contract.type !== 'TransferContract' && contract.type !== 'TriggerSmartContract') {
        return { verified: false, error: 'Not a transfer transaction' };
      }

      let toAddress, amount, fromAddress;

      if (contract.type === 'TransferContract') {
        // TRX transfer (not USDT)
        const value = contract.parameter.value;
        toAddress = value.to_address;
        fromAddress = value.owner_address;
        amount = value.amount / 1e6; // Convert from SUN to TRX
      } else if (contract.type === 'TriggerSmartContract') {
        // Smart contract call (USDT transfer)
        const value = contract.parameter.value;
        const data = value.data;
        
        // USDT TRC20 contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
        const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
        const contractAddress = value.contract_address;
        
        // Convert hex to base58 for comparison
        const decodedAddress = this.hexToBase58(contractAddress);
        if (decodedAddress !== usdtContract) {
          return { verified: false, error: 'Not a USDT transaction' };
        }

        // Parse transfer data
        // USDT transfer has 6 decimals
        const amountHex = '0x' + data.slice(72, 136);
        amount = parseInt(amountHex) / 1e6;
        
        // Extract addresses from data
        const toAddressHex = '0x' + data.slice(32, 72);
        toAddress = this.hexToBase58(toAddressHex.slice(2));
        fromAddress = value.owner_address;
      }

      // Verify receiving wallet
      if (toAddress !== expectedWallet) {
        return { 
          verified: false, 
          error: `Wrong receiving wallet. Expected: ${expectedWallet}, Got: ${toAddress}`
        };
      }

      // Verify amount
      if (amount < expectedAmount) {
        return {
          verified: false,
          error: `Insufficient amount. Expected: ${expectedAmount}, Got: ${amount}`
        };
      }

      return {
        verified: true,
        amount: amount,
        fromAddress: fromAddress,
        toAddress: toAddress,
        confirmations: tx.confirmations,
        blockNumber: tx.block_number
      };

    } catch (error) {
      console.error('TRC20 Verification Error:', error.message);
      return { verified: false, error: error.message };
    }
  }

  // Verify ERC20 (Ethereum) Transaction
  async verifyERC20(txHash, expectedAmount, expectedWallet) {
    try {
      // Etherscan API for ERC20 tokens
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          address: expectedWallet,
          apikey: process.env.ETHERSCAN_API_KEY
        }
      });

      if (response.data.status !== '1') {
        return { verified: false, error: 'Transaction not found' };
      }

      const tx = response.data.result.find(t => t.hash === txHash);
      if (!tx) {
        return { verified: false, error: 'Transaction not found for this wallet' };
      }

      // Check if confirmed (12+ blocks)
      const currentBlock = await this.getCurrentBlock('ethereum');
      const confirmations = currentBlock - parseInt(tx.blockNumber);
      if (confirmations < 12) {
        return { verified: false, error: 'Transaction not confirmed yet' };
      }

      // Check amount (USDT has 6 decimals)
      const amount = parseInt(tx.value) / 1e6;
      if (amount < expectedAmount) {
        return {
          verified: false,
          error: `Insufficient amount. Expected: ${expectedAmount}, Got: ${amount}`
        };
      }

      // Verify token is USDT
      const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
      if (tx.contractAddress.toLowerCase() !== usdtContract.toLowerCase()) {
        return { verified: false, error: 'Not a USDT transaction' };
      }

      return {
        verified: true,
        amount: amount,
        fromAddress: tx.from,
        toAddress: tx.to,
        confirmations: confirmations,
        blockNumber: parseInt(tx.blockNumber)
      };

    } catch (error) {
      console.error('ERC20 Verification Error:', error.message);
      return { verified: false, error: error.message };
    }
  }

  // Main verification method
  async verifyTransaction(txHash, network, expectedAmount, expectedWallet) {
    console.log(`Verifying transaction: ${txHash} on ${network}`);
    
    try {
      switch (network.toUpperCase()) {
        case 'TRC20':
          return await this.verifyTRC20(txHash, expectedAmount, expectedWallet);
        case 'ERC20':
          return await this.verifyERC20(txHash, expectedAmount, expectedWallet);
        case 'BEP20':
          // BSC verification (similar to ERC20 but using BSCScan)
          return await this.verifyBEP20(txHash, expectedAmount, expectedWallet);
        default:
          return { verified: false, error: 'Unsupported network' };
      }
    } catch (error) {
      console.error('Verification error:', error);
      return { verified: false, error: error.message };
    }
  }

  // Helper: Hex to Base58 (for Tron addresses)
  hexToBase58(hex) {
    // Simple implementation - use proper library in production
    // For now, just return as is for testing
    return hex;
  }

  // Get current block number
  async getCurrentBlock(network) {
    try {
      if (network === 'ethereum') {
        const response = await axios.get('https://api.etherscan.io/api', {
          params: {
            module: 'proxy',
            action: 'eth_blockNumber',
            apikey: process.env.ETHERSCAN_API_KEY
          }
        });
        return parseInt(response.data.result, 16);
      }
      return 0;
    } catch (error) {
      console.error('Get current block error:', error);
      return 0;
    }
  }

  // BEP20 (BSC) Verification
  async verifyBEP20(txHash, expectedAmount, expectedWallet) {
    try {
      const response = await axios.get('https://api.bscscan.com/api', {
        params: {
          module: 'account',
          action: 'tokentx',
          address: expectedWallet,
          apikey: process.env.BSCSCAN_API_KEY
        }
      });

      if (response.data.status !== '1') {
        return { verified: false, error: 'Transaction not found' };
      }

      const tx = response.data.result.find(t => t.hash === txHash);
      if (!tx) {
        return { verified: false, error: 'Transaction not found for this wallet' };
      }

      // BSC USDT contract: 0x55d398326f99059fF775485246999027B3197955
      const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
      if (tx.contractAddress.toLowerCase() !== usdtContract.toLowerCase()) {
        return { verified: false, error: 'Not a USDT transaction' };
      }

      const amount = parseInt(tx.value) / 1e18;
      if (amount < expectedAmount) {
        return {
          verified: false,
          error: `Insufficient amount. Expected: ${expectedAmount}, Got: ${amount}`
        };
      }

      return {
        verified: true,
        amount: amount,
        fromAddress: tx.from,
        toAddress: tx.to,
        confirmations: 20 // Approximate
      };

    } catch (error) {
      console.error('BEP20 Verification Error:', error.message);
      return { verified: false, error: error.message };
    }
  }
}

module.exports = new BlockchainService();