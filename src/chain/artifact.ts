// 由 artifacts 自动生成：合约 ABI 与部署字节码（npm run chain:artifact 重新生成）

export const HH_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialSigner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadySettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyStarted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Expired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidScore",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPlayer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnknownGame",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "startedAt",
        "type": "uint64"
      }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "score",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "digest",
        "type": "bytes32"
      }
    ],
    "name": "ScoreSettled",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SCORE",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SCORE_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "bestScore",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "gameCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "gamesOf",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "getGame",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "player",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "startedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "settledAt",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "score",
            "type": "uint16"
          },
          {
            "internalType": "bytes32",
            "name": "digest",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "settled",
            "type": "bool"
          }
        ],
        "internalType": "struct HallucinationHunter.Game",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "next",
        "type": "address"
      }
    ],
    "name": "setSigner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "signer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "score",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "digest",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const HH_BYTECODE = "0x60a060405234801561001057600080fd5b50604051610bd3380380610bd383398101604081905261002f91610100565b60008054336001600160a01b031991821617909155600180549091166001600160a01b038316179055604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f88740ae7bee7a5e2c97a5edf13c88828c9489135ff89eb955757dc24bc84f0fc918101919091527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260c00160408051601f19818403018152919052805160209091012060805250610130565b60006020828403121561011257600080fd5b81516001600160a01b038116811461012957600080fd5b9392505050565b608051610a816101526000396000818161010a01526106360152610a816000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610284578063944303a814610297578063a4323b4f146102be578063d28551f9146102e7578063dc0c695f146102fa578063fa1b3eb81461031e57600080fd5b8063238ac933146100b957806327ff6223146100e95780633644e515146101055780634c92fb121461013a5780636c19e7831461014f57806373931bbf14610162575b600080fd5b6001546100cc906001600160a01b031681565b6040516001600160a01b0390911681526020015b60405180910390f35b6100f26101f481565b60405161ffff90911681526020016100e0565b61012c7f000000000000000000000000000000000000000000000000000000000000000081565b6040519081526020016100e0565b61014d6101483660046108e9565b61033e565b005b61014d61015d366004610902565b6104a5565b61021f6101703660046108e9565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a081019190915250600090815260026020818152604092839020835160c08101855281546001600160a01b0381168252600160a01b900467ffffffffffffffff90811693820193909352600182015492831694810194909452600160401b90910461ffff1660608401529081015460808301526003015460ff16151560a082015290565b6040805182516001600160a01b0316815260208084015167ffffffffffffffff9081169183019190915283830151169181019190915260608083015161ffff16908201526080808301519082015260a09182015115159181019190915260c0016100e0565b6000546100cc906001600160a01b031681565b61012c7fd06e38eff654904ce4181a797553c560bc2980fe2850ab49f0256649815ec5b181565b61012c6102cc366004610902565b6001600160a01b031660009081526003602052604090205490565b61014d6102f5366004610932565b6104f2565b6100f2610308366004610902565b60046020526000908152604090205461ffff1681565b61033161032c366004610902565b610795565b6040516100e091906109da565b6000818152600260205260409020546001600160a01b03161561037457604051631fbde44560e01b815260040160405180910390fd5b6040805160c0810182523380825267ffffffffffffffff4281811660208086019182526000868801818152606088018281526080890183815260a08a018481528c855260028087528c86209b518c5498518b16600160a01b026001600160e01b03199099166001600160a01b039190911617979097178b55925160018b81018054945161ffff16600160401b0269ffffffffffffffffffff1990951692909a16919091179290921790975595519388019390935591516003968701805491151560ff199092169190911790558482529485528581208054938401815581529390932001849055915183917f26d445da9dd2ac9e2758817fa49dc0d62d860e9865147f45eeadd7e2f3c532559161049a919067ffffffffffffffff91909116815260200190565b60405180910390a350565b6000546001600160a01b031633146104d0576040516330cd747160e01b815260040160405180910390fd5b600180546001600160a01b0319166001600160a01b0392909216919091179055565b600086815260026020526040902080546001600160a01b03166105285760405163274f9f4960e21b815260040160405180910390fd5b80546001600160a01b03163314610552576040516329c5f7f360e21b815260040160405180910390fd5b600381015460ff16156105775760405162560ff960e81b815260040160405180910390fd5b8342111561059857604051630407b05b60e31b815260040160405180910390fd5b6101f461ffff871611156105bf57604051631556136560e01b815260040160405180910390fd5b604080517fd06e38eff654904ce4181a797553c560bc2980fe2850ab49f0256649815ec5b16020808301919091523382840152606082018a905261ffff8916608083015260a0820188905260c08083018890528351808403909101815260e08301845280519082012061190160f01b6101008401527f00000000000000000000000000000000000000000000000000000000000000006101028401526101228084018290528451808503909101815261014290930190935281519101206001546001600160a01b0316610693828787610801565b6001600160a01b0316146106ba57604051635cd5d23360e01b815260040160405180910390fd5b60018381018054600286018a905569ffffffffffffffffffff1916600160401b61ffff8c811691820267ffffffffffffffff1916929092174267ffffffffffffffff161790925560038601805460ff191690931790925533600090815260046020526040902054909116101561074957336000908152600460205260409020805461ffff191661ffff8a161790555b6040805161ffff8a1681526020810189905233918b917f571d7067186ea2de05bb0aa7b5dfc8a5d71a923e503d1276740b05ae6a35a83a910160405180910390a3505050505050505050565b6001600160a01b0381166000908152600360209081526040918290208054835181840281018401909452808452606093928301828280156107f557602002820191906000526020600020905b8154815260200190600101908083116107e1575b50505050509050919050565b60006041821461082457604051635cd5d23360e01b815260040160405180910390fd5b82356020840135604085013560001a601b81101561084a57610847601b82610a1e565b90505b8060ff16601b1415801561086257508060ff16601c14155b1561088057604051635cd5d23360e01b815260040160405180910390fd5b60408051600081526020810180835289905260ff831691810191909152606081018490526080810183905260019060a0016020604051602081039080840390855afa1580156108d3573d6000803e3d6000fd5b5050604051601f19015198975050505050505050565b6000602082840312156108fb57600080fd5b5035919050565b60006020828403121561091457600080fd5b81356001600160a01b038116811461092b57600080fd5b9392505050565b60008060008060008060a0878903121561094b57600080fd5b86359550602087013561ffff8116811461096457600080fd5b94506040870135935060608701359250608087013567ffffffffffffffff8082111561098f57600080fd5b818901915089601f8301126109a357600080fd5b8135818111156109b257600080fd5b8a60208285010111156109c457600080fd5b6020830194508093505050509295509295509295565b6020808252825182820181905260009190848201906040850190845b81811015610a12578351835292840192918401916001016109f6565b50909695505050505050565b60ff8181168382160190811115610a4557634e487b7160e01b600052601160045260246000fd5b9291505056fea2646970667358221220b418f9e0a0e444183bee51db6fcb32cb711f88fd3886af42440eef1992713bad64736f6c63430008180033" as const;
