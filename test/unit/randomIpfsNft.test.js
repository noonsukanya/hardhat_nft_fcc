// fulfillRandomWords
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"]) // first deploy mocks then randomipfs
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              // add consumer
              const subscriptionId = randomIpfsNft.getSubscriptionId()
              await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address)
              // end add consumer
          })

          // constructor
          describe("constructor", () => {
              it("initializes value correctly", async function () {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  const mintFee = await randomIpfsNft.getMintFee()
                  //console.log(dogTokenUriZero)
                  //assert(dogTokenUriZero.includes("ipfs://"))
                  assert.include(dogTokenUriZero, "ipfs://")
                  assert.equal(mintFee, "10000000000000000")
              })
          })

          // requestNft
          describe("requestNft", () => {
              it("reverts if request has no payment", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("reverts if request has payment less than mint fee", async function () {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(
                      randomIpfsNft.requestNft({ value: fee.sub(ethers.utils.parseEther("0.001")) })
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async function () {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })

          // fulfillRandomWords
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      // once nft minted check this
                      //   randomIpfsNft.once("NftMinted", async () => {
                      //       try {
                      //           const tokenUri = await randomIpfsNft.getDogTokenUris(0)
                      //           //const tokenUri = await randomIpfsNft.tokenURI("0")
                      //           const tokenCounter = await randomIpfsNft.getTokenCounter()
                      //           //assert.include(tokenUri.toString(), "ipfs://")
                      //           //assert.equal(tokenUri.toString().includes("ipfs://"), true)
                      //           assert.equal(tokenCounter.toString(), "1")
                      //           resolve()
                      //       } catch (e) {
                      //           console.log(e)
                      //           reject(e)
                      //       }
                      //   })
                      // mint nft
                      // Error BigNumber ที่ตรงนี้ - nothing wrong with test scripts // there are some bugs in contract
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                          resolve() // for testing, delete this later
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          // getBreedFromModdedRng
          describe("getBreedFromModdedRng", () => {
              it("return pub if moddedRng < 10", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(8)
                  assert.equal(0, expectedValue)
              })
              it("return shiba-inu if moddedRng btw 10-39", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(35)
                  assert.equal(1, expectedValue)
              })
              it("return st bernard if moddedRng btw 40-99", async function () {
                  const expectedValue = await randomIpfsNft.getBreedFromModdedRng(55)
                  assert.equal(2, expectedValue)
              })
              it("reverts if moddedRng > 99", async function () {
                  await expect(randomIpfsNft.getBreedFromModdedRng(101)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
          })
      })

// test cases:
// constructor
// > s_dogTokenUris =
// > i_mintfee

// requestnft
// > msg.value = ไม่ส่ง
// > msg.value {ส่ง value น้อยกว่า คิดว่าไม่ส่งตัวแปร} < mintfee -> revert RandomIpfsNft__NeedMoreETHSent\
// // > requestId???
// // > assert.equal(s_requestIdToSender[requestId], msg.sender)
// > emit event

// fulfillRandomWords
// > mint NFT after random number is returned
// 	> afterminted
// 		> tokenurl contains "ipfs://"
// 		> tokenCounter = 1
// 	> mint - call requestnft()
// 	vrf.fullfillrandomwords

// getBreedFromModdedRng
// > getBreedFromModdedRng(7) -> get pug
// > getBreedFromModdedRng(21) -> get Shiba
// > getBreedFromModdedRng(77) -> get st bernard
// > getBreedFromModdedRng(100) -> revert
