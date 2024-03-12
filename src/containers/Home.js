import {
  Button,
  Card,
  Row,
  Col,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

import * as metadata from "@metaplex-foundation/mpl-token-metadata";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  createTransferInstruction,
} from "@solana/spl-token";
import {PublicKey, sendAndConfirmTransaction} from "@solana/web3.js";
import axios from 'axios'

import RugGameIdl from "../idl/rug_game.json";

import { uploadMetadataToIpfs, mint, mintGenesis, mintPotion, mintLootBox, updateMeta, payToBackendTx, setProgramTransaction, createPotionMeta } from "../utils/mint";
import {burn, burnTx} from '../utils/nftburn'
import * as Const from '../utils/constants'
import api from "../api"

const { SystemProgram } = anchor.web3;

function getRandomInt(min, max) {       
  // Create byte array and fill with 1 random number
  var byteArray = new Uint8Array(1);
  window.crypto.getRandomValues(byteArray);

  var range = max - min + 1;
  var max_range = 256;
  if (byteArray[0] >= Math.floor(max_range / range) * range)
      return getRandomInt(min, max);
  return min + (byteArray[0] % range);
}

const Home = () => {
  let navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [tokens, setTokens] = useState([])
  const [gameLevel, setGameLevel] = useState(0)
  const [charged, setCharged] = useState(false)
  const [staked, setStaked] = useState(false)
  const [ruggedAccount, setRuggedAccount] = useState()
  const [rugToken, setRugToken] = useState(0)
  const [solBalance, setSolBalance] = useState(0)
  const [whitelist, setWhitelist] = useState({})
  const [ruggedTokenAddresses, setRuggedTokenAddresses] = useState([])

  const [mainProgram, setMainProgram] = useState()
  const provider = new anchor.AnchorProvider(connection, wallet);

  const hasDopeCat = tokens.filter(o=>o.data.symbol == 'DOPECATS').length > 0
  const hasGenesis = tokens.filter(o=>o.data.name == Const.GENESIS_NFT_NAME).length > 0
  const burnAvailable = !hasGenesis || tokens.filter(o=>o.meta && o.meta.attributes[0].value < 3).length > 0

  // const metaplex = new Metaplex(connection);

  useEffect(()=>{
    fetchData();
    initMainProgram()
    console.log(window.crypto)
  }, [])

  useEffect(()=>{
    if(gameLevel == 2) {
      beatFirstLevel()
    }
  }, [gameLevel])

  const fetchData = async () => {
    let walletInfo = await connection.getAccountInfo(provider.wallet.publicKey)
    console.log("walletInfo", walletInfo)
    setSolBalance(walletInfo.lamports)
    let whitelist = await api.getRuggedWhitelist()
    console.log('whitelist', whitelist)
    if(whitelist.length > 0) {
      setWhitelist(whitelist[0])
    }

    // const tokenMetadata = await metaplex.nfts().findAllByOwner(metaplex.identity().publicKey);
    // console.log('tokenMetadata', JSON.stringify(tokenMetadata));
    
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      provider.wallet.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );
    console.log('tokenAccounts', tokenAccounts)
    let tokens = []
    let tokenAddresses = []
    tokenAccounts.value.forEach((e) => {
      const accountInfo = AccountLayout.decode(e.account.data);
      // console.log('accountInfo', accountInfo)
      if(accountInfo.amount > 0) {
        let pubKey = `${new PublicKey(accountInfo.mint)}`
        if(pubKey === Const.RUG_TOKEN_MINTKEY) {
          setRugToken(Math.floor(Number(accountInfo.amount)/1000000000))
        } else {
          tokenAddresses.push(pubKey)
        }
      }
    })

    console.log('tokenAddresses', tokenAddresses)
    let ruggedTokenAddresses = tokenAddresses.filter(o=>whitelist[0].mint_keys.indexOf(o) != -1)
    setRuggedTokenAddresses(ruggedTokenAddresses)
    for(let address of tokenAddresses) {
      try {
        let tokenmetaPubkey = await metadata.Metadata.getPDA(address);
  
        const tokenmeta = await metadata.Metadata.load(connection, tokenmetaPubkey);
        if(tokenmeta.data.data.name == Const.GENESIS_NFT_NAME) {
          const meta = await axios.get(tokenmeta.data.data.uri)
          tokens.push({...tokenmeta.data, meta:meta.data})
        } else 
          tokens.push(tokenmeta.data)
      } catch(e) {
        console.log('e', e)
      }
    }
    console.log('tokens', tokens)
    setTokens(tokens)

    if(ruggedAccount && mainProgram) {
      let programAccount = await mainProgram.account.ruggedAccount.fetch(ruggedAccount);
      console.log('ruggedAccount', programAccount)
      setCharged(programAccount.charged)
      setStaked(programAccount.staked)
    }
  }

  const initMainProgram = async () => {
    anchor.setProvider(provider)
    const program = new Program(RugGameIdl, new anchor.web3.PublicKey(
      Const.RUG_GAME_PROGRAM_ID
    ), provider);
    console.log("Main Program Id: ", program, program.account,  program.programId.toBase58());
    setMainProgram(program)
    api.getRuggedAccount(wallet.publicKey.toBase58(), async (err, ret)=>{
      console.log('getRuggedAccount', wallet.publicKey.toBase58(), err, ret)
      if(ret.length == 0) {
        console.log('create account')
        //initialize account
        let ruggedAccount = anchor.web3.Keypair.generate();
        let tx = program.transaction.create(provider.wallet.publicKey, {
          accounts: {
            ruggedAccount: ruggedAccount.publicKey,
            user: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
          signers: [ruggedAccount],
        });

        const create_tx = new anchor.web3.Transaction().add(tx)
        let blockhashObj = await connection.getLatestBlockhash();
        console.log("blockhashObj", blockhashObj);
        create_tx.recentBlockhash = blockhashObj.blockhash;

        const signature = await wallet.sendTransaction(create_tx, connection, {
          signers: [ruggedAccount],
        });

        await connection.confirmTransaction(signature, "confirmed");

        let fetchData = await program.account.ruggedAccount.fetch(ruggedAccount.publicKey);
        console.log('ruggedAccount', fetchData)

        api.addRuggedAccount({
          player_account: wallet.publicKey,
          rugged_account: ruggedAccount.publicKey,
        }, (err, ret)=>{
          console.log('addRuggedAccount', err, ret)
        })
        setRuggedAccount(ruggedAccount.publicKey)
      } else {
        console.log('check account')
        let ruggedAccount = await program.account.ruggedAccount.fetch(ret[0].rugged_account);
        console.log('ruggedAccount', ruggedAccount)
        setCharged(ruggedAccount.charged)
        setRuggedAccount(ret[0].rugged_account)
      }
    })
  }

  const getImageUri = (name, symbol)=> {
    switch(name) {
      case "Rugged Nft": return 'https://ipfs.io/ipfs/bafkreid5t3xncfluofihoi5bxvdgpge6emccm2rvn6kjxp2s5eow37srmm';
      case Const.GENESIS_NFT_NAME: return Const.GENESIS_IMAGE_URL;
      case "Playable Nft": return 'https://ipfs.io/ipfs/bafkreielxhmgkc422vknos32qnqgzurq6uiignhgwmbryrk5namxgytbtu';
      case Const.POTION_NFT_NAME: return Const.POTION_IMAGE_URL;
      case Const.LOOTBOX_NFT_NAME: return Const.LOOTBOX_YES_IMAGE_URL;
    }

    if(symbol == "DOPECATS") return 'https://bafybeihf67ssq3wngutbfb2cuqhkni3p72xrezle3opemui5bkwvsg4an4.ipfs.dweb.link/1174.png'
    if(symbol == "RUGTOKEN") return 'https://1kin.mypinata.cloud/ipfs/QmS5Ecv3BbieocEbqb6TdSmdJ9Hkn1uqZiYZ5FCYgrdzFT'
    return ''
  }

  const burnToken = async (token)=>{
    console.log('burn', token)
    // const mintKey = anchor.web3.Keypair.generate();
    anchor.setProvider(provider);
    if(token.data.name == Const.GENESIS_NFT_NAME || token.data.name == Const.POTION_NFT_NAME) {
      await burn(token.mint, provider.wallet.publicKey, wallet, connection, 1)
      return await fetchData()
    } else {
      await burn(token.mint, provider.wallet.publicKey, wallet, connection, 1)

      if(hasGenesis) {
        //update meta
        let oldToken = tokens.find(o=>o.data.name == Const.GENESIS_NFT_NAME && o.meta.attributes[0].value < 3)
        if(!oldToken) return
        let oldMeta = oldToken.meta
        oldMeta.attributes[0].value = oldMeta.attributes[0].value + 1
        await updateMeta(oldToken, oldMeta)
      } else {
        //mint genesis
        await mintGenesis(wallet)
      }
      await fetchData()
    }
  }

  const getRugToken = (level, hasGene) => {
    return level * 2
  }

  const getPotion = (level, charged) => {
    if(!charged) return 0

    const percent = Math.min(level * 6.6, 100)
    return getRandomInt(0, 100) <= percent? 1 : 0;
  }

  const openLootBox = async (token)=>{
    anchor.setProvider(provider);

    //get token meta
    const meta = await axios.get(token.data.uri)
    console.log(meta)
    if(!meta || !meta.data) {
      return
    }

    let beatLevel = meta.data.attributes.find(o=>o.trait_type == 'level').value
    let isWon = meta.data.attributes.find(o=>o.trait_type == 'nft').value != 'No'

    console.log('burn', token)
    let burnInstruction = await burnTx(token.mint, provider.wallet.publicKey, wallet, connection, 1)
    const create_tx = new anchor.web3.Transaction().add(burnInstruction)

    let rugTokenAmount = getRugToken(beatLevel, hasGenesis)
    let potionAmount = getPotion(beatLevel, charged)

    console.log('open lootbox', rugTokenAmount, potionAmount, isWon)

    let tx = mainProgram.transaction.charge({
      accounts: {
        ruggedAccount: ruggedAccount,
        authority: provider.wallet.publicKey,
      },
    });

    let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.BACKEND_ACCOUNT_PUBKEY), Const.MINT_FEE);
    create_tx.add(tx, transferInstruction)

    if(potionAmount > 0) 
    {
      transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.MINT_FEE);
      create_tx.add(transferInstruction)
    }
    if(isWon) 
    {
      transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.PREMIUM_ACCOUNT_PUBKEY), Const.MINT_FEE);
      create_tx.add(transferInstruction)
    }

    let txSignature = window.crypto.randomUUID()
    let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)
    create_tx.add(signatureTx)

    let blockhashObj = await connection.getLatestBlockhash();
    console.log("blockhashObj", blockhashObj);
    create_tx.recentBlockhash = blockhashObj.blockhash;

    const signature = await wallet.sendTransaction(create_tx, connection);
    await connection.confirmTransaction(signature, "confirmed");

    let potionMeta = ""
    if(potionAmount > 0) {
      potionMeta = await createPotionMeta()
    }
    await api.openLootBox({
      key:wallet.publicKey.toBase58(),
      rugTokenAmount,
      potionAmount,
      potionMeta,
      isWon,
      txId: txSignature
    })

    await fetchData()
  }

  const chargeForGame = async (token)=>{
    console.log('chargeForGame', token)
    let oldMeta = token.meta
    oldMeta.attributes[0].value = oldMeta.attributes[0].value - 1

    let tx = mainProgram.transaction.charge({
      accounts: {
        ruggedAccount: ruggedAccount,
        authority: provider.wallet.publicKey,
      },
    });

    let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.UPDATE_META_FEE);

    let txSignature = window.crypto.randomUUID()
    let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)
    const create_tx = new anchor.web3.Transaction().add(
      transferInstruction, 
      tx, 
      signatureTx
    )
    const signature = await wallet.sendTransaction(create_tx, connection);
    await connection.confirmTransaction(signature, "confirmed");

    console.log('signature', signature)
    await updateMeta(token, oldMeta, wallet.publicKey, txSignature)
    
    await fetchData()
  }

  const startGame = async () => {
    setGameLevel(1)
  }

  const levelUp = async () => {
    if(gameLevel < Const.MAX_GAME_LEVEL) {
      setGameLevel(gameLevel+1)
    } else {
      setGameLevel(0)
    }
  }

  const endGame = async () => {
    //generate lootbox
    if(gameLevel > 1) {
      let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.MINT_FEE);
      let txSignature = window.crypto.randomUUID()
      let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)
  
      const create_tx = new anchor.web3.Transaction().add(transferInstruction, signatureTx)
      const signature = await wallet.sendTransaction(create_tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await mintLootBox(wallet, gameLevel - 1, false, 'Premium', txSignature)
    }

    setGameLevel(0)
    await fetchData()
  }

  const wonGame = async () => {
    //generate lootbox
    if(gameLevel > 1) {
      let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.MINT_FEE);
      let txSignature = window.crypto.randomUUID()
      let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)
      const create_tx = new anchor.web3.Transaction().add(transferInstruction, signatureTx)
      const signature = await wallet.sendTransaction(create_tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await mintLootBox(wallet, gameLevel, true, 'Premium', txSignature)
    }
      
    setGameLevel(0)
    await fetchData()
  }

  const beatFirstLevel = async()=>{
    if(!hasGenesis) {
      let random = getRandomInt(0,1);
      if(random == 1) {
        alert("Lucky Man! Genesis NFT will be minted")

        let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.MINT_FEE);
        let txSignature = window.crypto.randomUUID()
        let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)

        const create_tx = new anchor.web3.Transaction().add(transferInstruction, signatureTx)
        const signature = await wallet.sendTransaction(create_tx, connection);
        await connection.confirmTransaction(signature, "confirmed");

        //mint genesis
        await mintGenesis(wallet, txSignature)
        await fetchData()        
      }
    } else {
      const token = tokens.find((t)=>{
        return t.data.name == Const.GENESIS_NFT_NAME && t.meta.attributes[0].value < Const.MAX_CHARGE_COUNT
      })

      if(token) {
        console.log('selected genesis to charge', token)
        //upgrade meta of token
        let newMeta = token.meta
        newMeta.attributes[0].value = newMeta.attributes[0].value + 1
        let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.NFT_ACCOUNT_PUBKEY), Const.UPDATE_META_FEE);
        let txSignature = window.crypto.randomUUID()
        let signatureTx = setProgramTransaction(mainProgram, ruggedAccount, txSignature, wallet)

        const create_tx = new anchor.web3.Transaction().add(transferInstruction, signatureTx)
        const signature = await wallet.sendTransaction(create_tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        
        await updateMeta(token, newMeta, wallet.publicKey, txSignature)
        
        await fetchData()        
      }
    }
  }

  const stakeGenesis = async()=>{
    let genesis = tokens.find(o=>o.data.name == Const.GENESIS_NFT_NAME)
    console.log('genesis.mint', genesis.mint)
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, new PublicKey(genesis.mint), wallet.publicKey);
    console.log('fromTokenAccount', )
    // const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, new PublicKey(genesis.mint), new PublicKey(SERVER_PUBLICKEY));
    const toTokenAccount = await api.getOrCreateAssociatedTokenAccount(genesis.mint);
    console.log('fromTokenAccount, toTokenAccount', fromTokenAccount.address.toBase58(), toTokenAccount.result)

    const transaction = new anchor.web3.Transaction().add(
      createTransferInstruction(
          fromTokenAccount.address, // source
          // toTokenAccount.address, // dest
          new PublicKey(toTokenAccount.result),
          wallet.publicKey,
          1,
          [],
          TOKEN_PROGRAM_ID
      )
    )
    
    let tx = mainProgram.transaction.stake(new PublicKey(genesis.mint), {
      accounts: {
        ruggedAccount: ruggedAccount,
        authority: provider.wallet.publicKey,
      },
    });

    const create_tx = new anchor.web3.Transaction().add(transaction, tx)

    let blockhashObj = await connection.getLatestBlockhash();
    console.log("blockhashObj", blockhashObj);
    create_tx.recentBlockhash = blockhashObj.blockhash;

    const signature = await wallet.sendTransaction(create_tx, connection);

    await connection.confirmTransaction(signature, "confirmed");

    console.log('signature', signature)

    await fetchData()
  }

  const unstakeGenesis = async()=>{
    let programAccount = await mainProgram.account.ruggedAccount.fetch(ruggedAccount);
    if(programAccount.staked && programAccount.tokenAccount) {
      let tx = mainProgram.transaction.unstake({
        accounts: {
          ruggedAccount: ruggedAccount,
          authority: provider.wallet.publicKey,
        },
      }); 
      let transferInstruction = payToBackendTx(wallet.publicKey, new PublicKey(Const.BACKEND_ACCOUNT_PUBKEY), Const.TRANSFER_FEE);
      const create_tx = new anchor.web3.Transaction().add(tx, transferInstruction)
  
      let blockhashObj = await connection.getLatestBlockhash();
      console.log("blockhashObj", blockhashObj);
      create_tx.recentBlockhash = blockhashObj.blockhash;
  
      const signature = await wallet.sendTransaction(create_tx, connection);
  
      await connection.confirmTransaction(signature, "confirmed");
  
      const ret = await api.unstake(wallet.publicKey.toBase58(), programAccount.tokenAccount);

      console.log('signature', signature)  
      await fetchData()
    }
  }
  
  return (
    <Row style={{ margin: '50px 10px' }}>
      <Col span={16} offset={4}>
        <h2>My Wallet</h2>
        <div>
          {tokens.map((token, idx)=><Card key={idx} style={{width:250, height: 300, float:'left', margin:5}}>
            <img src={getImageUri(token.data.name, token.data.symbol)} style={{maxWidth:200, maxHeight: 200}}></img>
            {/* <p>{token.data.name}</p> */}
            {token.data.name == 'Rugged Nft' && <Button type="ghost" htmlType="submit" shape="round" style={{ marginTop: 20 }} disabled={!burnAvailable} onClick={()=>burnToken(token)}>
                Burn Nft
            </Button>}
            {token.data.name == Const.POTION_NFT_NAME && <Button type="ghost" htmlType="submit" shape="round" style={{ marginTop: 20 }} onClick={()=>burnToken(token)}>
                Burn Nft
            </Button>}
            {/* <p>{token.data.name}</p> */}
            {token.data.name == Const.LOOTBOX_NFT_NAME && <Button type="ghost" htmlType="submit" shape="round" style={{ marginTop: 20 }} onClick={()=>openLootBox(token)}>
                Open LootBox
            </Button>}
            {token.data.name == Const.GENESIS_NFT_NAME && <div><Button type="ghost" htmlType="submit" shape="round" style={{ marginTop: 20, marginRight: 10 }} disabled={(token.meta.attributes[0].value == 0||charged)&&false  } onClick={()=>chargeForGame(token)}>
                Discharge
            </Button><Button type="ghost" htmlType="submit" shape="round" style={{ marginTop: 20 }} disabled={token.meta.attributes[0].value == 0} onClick={()=>burnToken(token)}>
                Burn 
            </Button></div>}
          </Card>)}
          {rugToken>0&&<Card style={{width:250, height: 300, float:'left', margin:5}}>
            <img src={getImageUri('', 'RUGTOKEN')} style={{width:'100%'}}></img>
            <h3 style={{marginTop: 20}}>{rugToken} $RUG</h3>
            </Card>}
        </div>
        <div style={{clear:'both'}}></div>
        {hasDopeCat && <h3 style={{marginTop: 40}}>You own Dope Cat NFT so that your play charactor will be upgrade.</h3>}
        {charged && <h3 style={{marginTop: 10}}>You charged Genesis NFT for LootBox mode.</h3>}
        {hasGenesis && !staked && <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginTop: 20, width: 200, marginRight: 30 }} onClick={stakeGenesis}>
               Stake Genesis
        </Button>}
        {staked && <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginTop: 20, width: 200, marginRight: 30 }} onClick={unstakeGenesis}>
               Unstake Genesis
        </Button>}
        {gameLevel == 0 && <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginTop: 20, width: 200 }} onClick={startGame}>
               Play Game
        </Button>}
        {gameLevel > 0 &&<div>
          <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginLeft:30, marginTop: 20, width: 200 }} onClick={levelUp}>
               Beat {gameLevel == Const.MAX_GAME_LEVEL?'Final Level':'Level' + gameLevel}
          </Button>
          <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginTop: 20, width: 200 }} onClick={endGame}>
               End Game
          </Button>
          <Button type="primary" htmlType="submit" shape="round" size="large" style={{ marginTop: 20, width: 200 }} onClick={wonGame}>
               Won Game
          </Button>
        </div>}
      </Col>
    </Row>
  );
};

export default Home;
