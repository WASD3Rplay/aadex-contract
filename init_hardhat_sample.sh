#!/usr/bin/env bash

cp env.hardhat .env

npm run clean; npm run compile

npm run deploy-aadex

npm run deploy-sample-usdt

npm run deploy-sample-hunt

echo ""
echo " >>>>>>>>>>>>>>>> Deposit to EntryPoint"
NODE_TO_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 npx ts-node ./scripts/transfer_native.ts

echo ""
echo " >>>>>>>>>>>>>>>> Add Jenny as an admin in DexManager"
NODE_ADMIN_ADDRESS=0x12a27BB55895e1462d3b877F385863B8e7E8aa0f npx ts-node ./scripts/add_aadex_admin.ts

echo ""
echo " >>>>>>>>>>>>>>>> Top up Admin Jenny native token"
echo "* Top up ETH"
NODE_TO_ADDRESS=0x12a27BB55895e1462d3b877F385863B8e7E8aa0f npx ts-node ./scripts/transfer_native.ts

echo ""
echo " >>>>>>>>>>>>>>>> for Twice: 0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8"
TWICE_SIGNER_SECRET="49a5a2f31293e1c6805e239cf87d7eb6f1418a2e89b57d8926df72d5457b1999"

echo "* Top up ETH"
NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_erc20.ts

echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts

echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts

echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts


echo ""
echo " >>>>>>>>>>>>>>>> for BlackPink: 0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2"
BLACKPINK_SIGNER_SECRET="ef81f7876f1d961992ed5633f64ac360728cc84d3aadf1969c861e79d3a4b7dd"

echo "* Top up ETH"
NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_erc20.ts

echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts

echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts

echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts


echo ""
echo " >>>>>>>>>>>>>>>> for NewJeans: 0x0C76AB2E49E443629c682E2C3767BD1D9AE20888"
NEWJEANS_SIGNER_SECRET="8ad814bf0f35ac18d35bec52da78da1a6c8ef9f2a20b2c87b574278c26d5852b"

echo "* Top up ETH"
NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_erc20.ts

echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts

echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts

echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts