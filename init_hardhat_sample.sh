#!/usr/bin/env bash

# ETH/USDT market admin
ADMIN_JISOO_ADDRESS=0x34e98393960250c1eAe9DB6E694FB0dCDb6B8bB7
ADMIN_JISOO_SECRET=3b3122492029ca6e2d93ccd28300793b8451ad63f71d1a764e031161ac2de81f
ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS="0xBf836577272d7EFA2159dF8CcBF98D2252e69124"

# HUNT/USDT market admin
ADMIN_JENNY_ADDRESS=0x12a27BB55895e1462d3b877F385863B8e7E8aa0f
ADMIN_JENNY_SECRET=d8b46f98deafafaa6e1463ae4f923150838012acc28af8550c7a47e08a96d955
ADMIN_JENNY_SWAP_CALLER_CA_ADDRESS="0xc8Fa72ee7391bd36461126f99e08D3bafA86d387"

USER_TWICE_ADDRESS=0x23F90Ea561387b27AeDBdAAc72dcB13DEaE40aC8
TWICE_SIGNER_SECRET="49a5a2f31293e1c6805e239cf87d7eb6f1418a2e89b57d8926df72d5457b1999"

USER_BLACKPINK_ADDRESS=0x5F2657eE64A12865f9A2d0A5925d69Def6f139C2
BLACKPINK_SIGNER_SECRET="ef81f7876f1d961992ed5633f64ac360728cc84d3aadf1969c861e79d3a4b7dd"

USER_NEWJEANS_ADDRESS=0x0C76AB2E49E443629c682E2C3767BD1D9AE20888
NEWJEANS_SIGNER_SECRET="8ad814bf0f35ac18d35bec52da78da1a6c8ef9f2a20b2c87b574278c26d5852b"


# -------------------------------------------------------------------------------------------------------
# Start process

cp ./dotenvs/dotenv.hardhat .env

# npm run clean
npm run compile


# -------------------------------------------------------------------------------------------------------
# Deploy smart contracts

echo ""
echo " >>>>>>>>>>>>>>>> Deploy EntryPoint and DexManager"
npm run deploy-aadex

echo ""
echo " >>>>>>>>>>>>>>>> Deploy USDT"
NODE_FORCE_DEPLOY=true npx ts-node scripts/samples/deploy_sample_usdt.ts

echo ""
echo " >>>>>>>>>>>>>>>> Deploy HUNT"
NODE_FORCE_DEPLOY=true npx ts-node scripts/samples/deploy_sample_hunt.ts


# -------------------------------------------------------------------------------------------------------
# Register ETH/USDT admin

echo ""
echo " >>>>>>>>>>>>>>>> Admin JISOO of ETH/USDT market"
echo " ... Top up native token for TX fee"
NODE_TO_ADDRESS="$ADMIN_JISOO_ADDRESS" npx ts-node ./scripts/transfer_native.ts
# AADexSwapCaller > _validateSignature 에서 userOpSigner가 admin인지 체크함.
echo " ... Add ADMIN: EOA as a TX signer"
NODE_ADMIN_ADDRESS="$ADMIN_JISOO_ADDRESS" npx ts-node ./scripts/add_aadex_admin.ts
echo " ... Deploy Swap Caller (contract account, CA)"
# `deploy_swap_caller` does register SwapCaller as an admin
NODE_MARKET_ADMIN_SECRET="$ADMIN_JISOO_SECRET" npx ts-node ./scripts/deploy_swap_caller.ts
echo " ... Deposit 0.5 ETH in SwapCaller balance of EntryPoint for paymaster logic"
# paymaster가 따로 있으면 paymaster 계정만 deposit 해주면 됨.
NODE_TO_ADDRESS="$ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/deposit_to_entrypoint.ts


# -------------------------------------------------------------------------------------------------------
# Register HUNT/USDT admin

echo ""
echo " >>>>>>>>>>>>>>>> Admin JENNY of HUNT/USDT market"
echo " ... Top up native token for TX fee"
NODE_TO_ADDRESS="$ADMIN_JENNY_ADDRESS" npx ts-node ./scripts/transfer_native.ts
# AADexSwapCaller > _validateSignature 에서 userOpSigner가 admin인지 체크함.
echo " ... Add ADMIN: EOA as a TX signer"
NODE_ADMIN_ADDRESS="$ADMIN_JENNY_ADDRESS" npx ts-node ./scripts/add_aadex_admin.ts
echo " ... Deploy Swap Caller (contract account, CA)"
# `deploy_swap_caller` does register SwapCaller as an admin
NODE_MARKET_ADMIN_SECRET="$ADMIN_JENNY_SECRET" npx ts-node ./scripts/deploy_swap_caller.ts
echo " ... Deposit 0.5 ETH in SwapCaller balance of EntryPoint for paymaster logic"
# paymaster가 따로 있으면 paymaster 계정만 deposit 해주면 됨.
NODE_TO_ADDRESS="$ADMIN_JENNY_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/deposit_to_entrypoint.ts


# -------------------------------------------------------------------------------------------------------
# Prepare Nectar users

echo ""
echo " >>>>>>>>>>>>>>>> for Twice: $USER_TWICE_ADDRESS"
echo "* Top up ETH"
NODE_TO_ADDRESS="$USER_TWICE_ADDRESS" npx ts-node ./scripts/transfer_native.ts
echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS="$USER_TWICE_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS="$USER_TWICE_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts
echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts
echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$TWICE_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts


echo ""
echo " >>>>>>>>>>>>>>>> for BlackPink: $USER_BLACKPINK_ADDRESS"
echo "* Top up ETH"
NODE_TO_ADDRESS="$USER_BLACKPINK_ADDRESS" npx ts-node ./scripts/transfer_native.ts
echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS="$USER_BLACKPINK_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS="$USER_BLACKPINK_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts
echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts
echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$BLACKPINK_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts


echo ""
echo " >>>>>>>>>>>>>>>> for NewJeans: $USER_NEWJEANS_ADDRESS"
echo "* Top up ETH"
NODE_TO_ADDRESS="$USER_NEWJEANS_ADDRESS" npx ts-node ./scripts/transfer_native.ts
echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS="$USER_NEWJEANS_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Top up HUNT"
NODE_TOKEN_SYMBOL=HUNT NODE_TO_ADDRESS="$USER_NEWJEANS_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Deposit ETH to AADex"
NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_native_to_aadex.ts
echo "* Deposit USDT to AADex"
NODE_TOKEN_SYMBOL=USDT NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts
echo "* Deposit HUNT to AADex"
NODE_TOKEN_SYMBOL=HUNT NODE_SIGNER_SECRET=$NEWJEANS_SIGNER_SECRET npx ts-node ./scripts/deposit_erc20_to_aadex.ts


# -------------------------------------------------------------------------------------------------------
# Test Deposit ETH into Swap Caller's trading wallet of DexManager
echo ""
echo " >>>>>>>>>>>>>>>> Deposit ETH to admin JISOO"
NODE_TO_ADDRESS="$ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/deposit_native_to_aadex.ts


# -------------------------------------------------------------------------------------------------------
# Test Withdraw ETH from Swap Caller's trading wallet of DexManager to Superuser funding wallet
echo ""
echo " >>>>>>>>>>>>>>>> Withdraw ETH from admin JISOO to superuser"
NODE_ADMIN_ADDRESS="$ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/withdraw_admin_native.ts


# -------------------------------------------------------------------------------------------------------
# Test Withdraw USDT from Swap Caller's trading wallet of DexManager to Superuser funding wallet
# echo ""
# echo " >>>>>>>>>>>>>>>> Withdraw USDT from admin JISOO to superuser"
# NODE_TOKEN_SYMBOL=HUNT NODE_ADMIN_ADDRESS="$USER_NEWJEANS_ADDRESS" npx ts-node ./scripts/withdraw_admin_erc20.ts


# -------------------------------------------------------------------------------------------------------
# Transfer from SwapCaller to EOA account

echo ""
echo " >>>>>>>>>>>>>>>> Admin JISOO SwapCaller: $ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS"
echo "* Top up ETH"
NODE_TO_ADDRESS="$ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/transfer_native.ts
echo "* Transfer ETH from SwapCaller"
NODE_SWAP_CALLER_ADDRESS="$ADMIN_JISOO_ADDRESS" npx ts-node ./scripts/transfer_native_from_swapcaller.ts
echo "* Top up USDT"
NODE_TOKEN_SYMBOL=USDT NODE_TO_ADDRESS="$ADMIN_JISOO_SWAP_CALLER_CA_ADDRESS" npx ts-node ./scripts/transfer_erc20.ts
echo "* Transfer USDT from SwapCaller"
NODE_TOKEN_SYMBOL=USDT NODE_SWAP_CALLER_ADDRESS="$ADMIN_JISOO_ADDRESS" npx ts-node ./scripts/transfer_erc20_from_swapcaller.ts