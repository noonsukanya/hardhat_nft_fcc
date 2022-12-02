// SPDX-License-Identifier: MIT
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
//import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__TransferFailed();
error RandomIpfsNft__RangeOutOfBounds();

contract RandomIpfsNft is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
    //when we mint NFT, we will trigger a Chainlink VRF call for random number
    //using that number, we will get a random NFT
    // Pug, Shiba Inu, St. Bernard
    // Pug - super rare, Shiba - rare, St. bernard - common

    // users have to pay to mint an NFT
    // the owner of the contract can withdraw the ETH

    // option 1: set dogbreed mapping to tokenURI and have that return in tokenURI fn
    // or option 2: call function setTokenURI (Openzeppelin - ERC721URIStorage.sol) - not gas optimization but it has the most customization

    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT Variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris; // point to NFT json
    uint256 internal i_mintFee;

    // Events
    event NftRequested(uint256 indexed requestedId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 mintFee,
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        // construction still uses ERC721 not ERC721URIStorage b/c ERC721URIStorage is the extension of ERC721
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenUris = dogTokenUris;
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNft__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        // need event
        emit NftRequested(requestId, msg.sender);
    }

    // override fulfillRandomWords of vrfCoordinatorV2Mock
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwner = s_requestIdToSender[requestId]; // dogowner is whoever call the requestNft(), not owner of contract
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter += 1;
        // nft looks like
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE; // 0 - 99
        // 0-10 > Pub, 11-30 > Shiba, otherwise 41-99 -> St. Bernard
        Breed dogBreed = getBreedFromModdedRng(moddedRng);

        _safeMint(dogOwner, newTokenId);
        // set image
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    // user 'modifer' only owner can withdraw -> openzeppelin provides that "@openzeppelin/contracts/access/Ownable.sol";
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();

        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum = chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 40, MAX_CHANCE_VALUE]; // [Pug-10%, Shiba-30%, St. Bernard-60%]
    }

    // no need tokeURI(), since we use _setTokenURI instead
    // function tokenURI(uint256) public view override returns (string memeory) {}

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getSubscriptionId() public view returns (uint64) {
        return i_subscriptionId;
    }
}
