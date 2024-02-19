import findOrDeployDecimal18Contract from "./deploy_sample_erc20"

const main = async (): Promise<void> => {
  const tokenName = "Wasd3r Demo SuperWalk Token"
  const tokenSymbol = "GRND"

  await findOrDeployDecimal18Contract(tokenName, tokenSymbol)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
