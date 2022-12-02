const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let basicNft, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNft", deployer)
          })

          // Test# 1 constructor
          describe("Constructor", () => {
              // check name="Doggie", symbole="DOG", s_tokenCounter = 0
              it("Initializes NFT ERC721 Correctly", async () => {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(name, "Doggie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })

          // Test# 2 mint NFT fn
          describe("Mint NFT", () => {
              beforeEach(async () => {
                  const txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
              })

              it("after mint, update value correctly", async () => {
                  const tokenURI = await basicNft.tokenURI(0)
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(tokenURI, await basicNft.TOKEN_URI())
                  assert.equal(tokenCounter.toString(), "1")
              })

              it("after mint, show correct balance and correct owner", async () => {
                  const deployerAddress = deployer.address
                  const deployerBalance = await basicNft.balanceOf(deployerAddress)
                  const owner = await basicNft.ownerOf(0)

                  //   console.log(deployerAddress)
                  //   console.log(deployerBalance.toString())
                  //   console.log(owner)
                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployerAddress)
              })
          })
      })
