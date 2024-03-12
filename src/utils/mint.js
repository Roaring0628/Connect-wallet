import * as ipfsClient from "ipfs-http-client";

import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";

import * as Const from './constants'
import RugGameIdl from "../idl/rug_game.json";
import { PublicKey } from "@solana/web3.js";
import api from "../api";

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const ipfs = ipfsClient.create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

export const uploadMetadataToIpfs = async (metadata) => {
  const uploadedMetadata = await ipfs.add(JSON.stringify(metadata));

  if (uploadedMetadata == null) {
    return null;
  } else {
    return `https://1kin.mypinata.cloud/ipfs/${uploadedMetadata.path}`;
  }
};

export const updateMeta = async (token, newMeta, playerAccount, txId)=>{
  let newUri = await uploadMetadataToIpfs(newMeta)
  console.log('newUri', newUri)

  let ret = await api.updateNftMeta({token, metaUri: newUri, playerAccount, txId})
  console.log('ret', ret)
  return ret
}

export const mintGenesis = async (wallet, txId) => {
  let uploadedMetatdataUrl = await uploadMetadataToIpfs({
    name: Const.GENESIS_NFT_NAME,
    symbol: Const.GENESIS_NFT_SYMBOL,
    description: Const.GENESIS_NFT_DESCRIPTION,
    image: Const.GENESIS_IMAGE_URL,
    external_url: "https://ruggedrevenants.io/",
    collection:{"name":"Dope Cats", "family": "Dope Cats"},
    attributes: [
      {
        trait_type: "charges",
        value: 3,
      },
      {
        trait_type: "Collection",
        value: "Dope Cat Revenants",
      },
    ],
  });

  if (uploadedMetatdataUrl == null) return;
  console.log("Uploaded meta data url: ", uploadedMetatdataUrl);
  // await mint(connection, wallet, Const.GENESIS_NFT_NAME, Const.GENESIS_NFT_SYMBOL, true, uploadedMetatdataUrl, burnInstruction);
  let ret = await api.mintNft({name: Const.GENESIS_NFT_NAME, symbol: Const.GENESIS_NFT_SYMBOL, mutable:true, metadataUrl:uploadedMetatdataUrl, playerKey: wallet.publicKey, txId})
  console.log('mint result from api', ret)
}

export const mintLootBox = async (wallet, level, hasPremium, gameMode, txId) => {
  let uploadedMetatdataUrl = await uploadMetadataToIpfs({
    name: Const.LOOTBOX_NFT_NAME,
    symbol: Const.LOOTBOX_NFT_SYMBOL,
    description: Const.LOOTBOX_NFT_DESCRIPTION,
    image: hasPremium?Const.LOOTBOX_YES_IMAGE_URL:Const.LOOTBOX_NO_IMAGE_URL,
    external_url: "https://ruggedrevenants.io/",
    collection:{"name":"Rugged Revenants Rewards Receptacles", "family": "Rugged Revenants Rewards Receptacles"},
    attributes: [
      {
        trait_type: "level",
        value: level,
      },
      {
        trait_type: "nft",
        value: hasPremium?(gameMode||'Premium'):'No',
      },
    ],
  });

  if (uploadedMetatdataUrl == null) return;
  console.log("Uploaded meta data url: ", uploadedMetatdataUrl);
  let ret = await api.mintNft({name: Const.LOOTBOX_NFT_NAME, symbol: Const.LOOTBOX_NFT_SYMBOL, mutable:false, metadataUrl:uploadedMetatdataUrl, playerKey: wallet.publicKey, txId})
  console.log('mint result from api', ret)

  // await mint(connection, wallet, Const.LOOTBOX_NFT_NAME, Const.LOOTBOX_NFT_SYMBOL, false, uploadedMetatdataUrl);
}

export const mintPotion = async (wallet, txId) => {
  let uploadedMetatdataUrl = await uploadMetadataToIpfs({
    name: Const.POTION_NFT_NAME,
    symbol: Const.POTION_NFT_SYMBOL,
    description: Const.POTION_NFT_DESCRIPTION,
    image: Const.POTION_IMAGE_URL,
    external_url: "https://ruggedrevenants.io/",
    collection:{"name":"Rugged Revenants Alchemical Agents", "family": "Rugged Revenants Alchemical Agents"},
    attributes: [],
  });

  if (uploadedMetatdataUrl == null) return;
  console.log("Uploaded meta data url: ", uploadedMetatdataUrl);
  let ret = await api.mintNft({name: Const.POTION_NFT_NAME, symbol: Const.POTION_NFT_SYMBOL, mutable:false, metadataUrl:uploadedMetatdataUrl, playerKey: wallet.publicKey, txId})
  console.log('mint result from api', ret)

  // await mint(connection, wallet, Const.POTION_NFT_NAME, Const.POTION_NFT_SYMBOL, false, uploadedMetatdataUrl);
}

export const createPotionMeta = async () => {
  let uploadedMetatdataUrl = await uploadMetadataToIpfs({
    name: Const.POTION_NFT_NAME,
    symbol: Const.POTION_NFT_SYMBOL,
    description: Const.POTION_NFT_DESCRIPTION,
    image: Const.POTION_IMAGE_URL,
    external_url: "https://ruggedrevenants.io/",
    collection:{"name":"Rugged Revenants Alchemical Agents", "family": "Rugged Revenants Alchemical Agents"},
    attributes: [],
  });

  return uploadedMetatdataUrl
}

export const mint = async (
  connection,
  wallet,
  name,
  symbol,
  mutable,
  metadataUrl,
  burnInstruction,
) => {
  const provider = new anchor.AnchorProvider(connection, wallet);
  anchor.setProvider(provider);

  const program = new Program(RugGameIdl, new PublicKey(Const.RUG_GAME_PROGRAM_ID), provider);
  console.log("Program Id: ", program.programId.toBase58());
  console.log("Mint Size: ", MINT_SIZE);
  const lamports =
    await program.provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );
  console.log("Mint Account Lamports: ", lamports);

  const getMetadata = async (mint) => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const mintKey = anchor.web3.Keypair.generate();

  const nftTokenAccount = await getAssociatedTokenAddress(
    mintKey.publicKey,
    provider.wallet.publicKey
  );
  console.log("NFT Account: ", nftTokenAccount.toBase58());

  console.log("Mint key: ", mintKey.publicKey.toString());
  console.log("User: ", provider.wallet.publicKey.toString());

  const metadataAddress = await getMetadata(mintKey.publicKey);
  console.log("Metadata address: ", metadataAddress.toBase58());

  try {
    const tx = program.transaction.mintNft(
      mintKey.publicKey,
      name,
      symbol,
      metadataUrl,
      mutable,
      {
        accounts: {
          mintAuthority: provider.wallet.publicKey,
          mint: mintKey.publicKey,
          tokenAccount: nftTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadata: metadataAddress,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      }
    );
    console.log('tx', tx)
    const mint_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),
      createInitializeMintInstruction(
        mintKey.publicKey,
        0,
        provider.wallet.publicKey,
        provider.wallet.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        nftTokenAccount,
        provider.wallet.publicKey,
        mintKey.publicKey
      ),
      tx
    );

    if(burnInstruction) {
      mint_tx.add(burnInstruction)
    }
    console.log('mint_tx', mint_tx)
    let blockhashObj = await connection.getLatestBlockhash();
    console.log("blockhashObj", blockhashObj);
    mint_tx.recentBlockhash = blockhashObj.blockhash;

    const signature = await wallet.sendTransaction(mint_tx, connection, {
      signers: [mintKey],
    });
    await connection.confirmTransaction(signature, "confirmed");
    console.log("Mint Success!");
    return true;
  } catch {
    return false;
  }
};

export const payToBackendTx = (from, receiver, amount)=>{
  return anchor.web3.SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: receiver,
    lamports: amount,
  })
}

export const setProgramTransaction = (program, ruggedAccount, txId, wallet)=>{
  return program.transaction.setTransaction(txId, {
    accounts: {
      ruggedAccount: ruggedAccount,
      authority: wallet.publicKey,
    },
  })
}