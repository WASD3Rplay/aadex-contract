#!/usr/bin/env bash

npm run clean; npm run compile

npm run deploy-aadex

npm run deploy-sample-usdt

npm run deploy-sample-hunt

echo ""
echo " >>>>>>>>>>>>>>>> Deposit to EntryPoint"
NODE_TO_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 npx ts-node ./scripts/transfer_native.ts

echo ""
echo " >>>>>>>>>>>>>>>> for Twice"
echo "* Top up ETH"
NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8 npx ts-node ./scripts/transfer_erc20.ts

echo ""
echo " >>>>>>>>>>>>>>>> for BlackPink"
echo "* Top up ETH"
NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2 npx ts-node ./scripts/transfer_erc20.ts

echo ""
echo " >>>>>>>>>>>>>>>> for NewJeans"
echo "* Top up ETH"
NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_native.ts

echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_erc20.ts

echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888 npx ts-node ./scripts/transfer_erc20.ts
