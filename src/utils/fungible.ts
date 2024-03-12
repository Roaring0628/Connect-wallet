import { createMint, getMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from '@solana/spl-token';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

(async ()=>{
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const freezeAuthority = Keypair.generate();

  console.log("payer.publicKey", payer.publicKey.toBase58())
  const connection = new Connection(
    clusterApiUrl('devnet'),
    'confirmed'
    );
    
  const fromAirdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(fromAirdropSignature);

  //create fungible token
  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    9 // We are using 9 to match the CLI decimal default exactly
  );
  
  console.log(mint.toBase58());

  let mintInfo = await getMint(
    connection,
    mint
  )
  
  console.log("mintInfo.supply before minting", mintInfo.supply);

  //create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  )
  
  console.log(tokenAccount.address.toBase58());

  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    mintAuthority,
    100
  )

  mintInfo = await getMint(
    connection,
    mint
  )
  
  console.log("mintInfo.supply after minting", mintInfo.supply);

  const tokenAccountInfo = await getAccount(
    connection,
    tokenAccount.address
  )
  
  console.log(tokenAccountInfo.amount);
})()