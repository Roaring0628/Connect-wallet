import { getAssociatedTokenAddress, createBurnInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { WalletContextState } from "@solana/wallet-adapter-react";
import BN from 'bn.js';
import * as BufferLayout from 'buffer-layout';

const uint64 = (property = 'uint64') => {
    return BufferLayout.blob(8, property);
  };
  class u64 extends BN {
    /**
     * Convert to Buffer representation
     */
    toBuffer() {
      const a = super.toArray().reverse();
      const b = Buffer.from(a);
 
      if (b.length === 8) {
        return b;
      }
 
      const zeroPad = Buffer.alloc(8);
      b.copy(zeroPad);
      return zeroPad;
    }
    /**
     * Construct a u64 from Buffer representation
     */
 
    static fromBuffer(buffer) {
      return new u64(
        [...buffer]
          .reverse()
          .map((i) => `00${i.toString(16)}`.slice(-2))
          .join(''),
        16
      );
    }
  }

export async function burn(tokenMintAddress, owner, wallet, connection, amount) {
    try {
        const mintPublickey = new PublicKey(tokenMintAddress);
        console.log('here-1', mintPublickey)
        const associatedAddress = await getAssociatedTokenAddress(
            mintPublickey,
            owner,
        );
        console.log('here-2', associatedAddress)

        const burnInstruction = await createBurnInstruction(
            associatedAddress,
            mintPublickey,
            owner,
            amount,
            [],
            TOKEN_PROGRAM_ID,
        );

        console.log('here-3', burnInstruction)

        const BurnTransaction = new Transaction().add(burnInstruction);

        const BurnandCloseSignature = await wallet.sendTransaction(BurnTransaction, connection);

        return await connection.confirmTransaction(BurnandCloseSignature, 'processed');
    } catch (error) {
        console.log(error)
    }
}

export async function burnTx(tokenMintAddress: string, owner: PublicKey, wallet: WalletContextState, connection: Connection, amount:number) {
    try {
        const mintPublickey = new PublicKey(tokenMintAddress);
        console.log('here-1', mintPublickey)
        const associatedAddress = await getAssociatedTokenAddress(
            mintPublickey,
            owner,
        );
        console.log('here-2', associatedAddress)

        const burnInstruction = await createBurnInstruction(
            associatedAddress,
            mintPublickey,
            owner,
            amount,
            [],
            TOKEN_PROGRAM_ID,
        );

        return burnInstruction
    } catch (error) {
        console.log(error)
    }
}

// import { Transaction, TransactionInstruction } from "@solana/web3.js";
// import * as BufferLayout from 'buffer-layout';
// import BN from 'bn.js';
// function isAccount(accountOrPublicKey) {
//    return 'publicKey' in accountOrPublicKey;
// }

// const uint64 = (property = 'uint64') => {
//    return BufferLayout.blob(8, property);
//  };
//  class u64 extends BN {
//    /**
//     * Convert to Buffer representation
//     */
//    toBuffer() {
//      const a = super.toArray().reverse();
//      const b = Buffer.from(a);

//      if (b.length === 8) {
//        return b;
//      }

//      const zeroPad = Buffer.alloc(8);
//      b.copy(zeroPad);
//      return zeroPad;
//    }
//    /**
//     * Construct a u64 from Buffer representation
//     */

//    static fromBuffer(buffer) {
//      return new u64(
//        [...buffer]
//          .reverse()
//          .map((i) => `00${i.toString(16)}`.slice(-2))
//          .join(''),
//        16
//      );
//    }
//  }

// export const burn = async function (
//    account,
//    owner,
//    multiSigners,
//    amount,
//    connection,
//    programId,
//    publicKey,
//    payer
//  ) {
//    let ownerPublicKey;
//    let signers;

//    const provider = owner

//    if (isAccount(owner)) {
//      ownerPublicKey = owner.publicKey;
//      signers = [owner];
//    } else {
//      ownerPublicKey = owner;
//      signers = multiSigners;
//    }
//    const transaction = new Transaction().add(
//      createBurnInstruction(
//        programId,
//        publicKey,
//        account,
//        ownerPublicKey,
//        multiSigners,
//        amount
//      )
//    );
//    transaction.feePayer = provider.publicKey;
//    console.log('Getting recent blockhash');
//    transaction.recentBlockhash = (
//      await connection.getRecentBlockhash()
//    ).blockhash;
//    let signed = await provider.signTransaction(transaction);
//    let signature = await connection.sendRawTransaction(signed.serialize());
//    let confirmed = await connection.confirmTransaction(signature);
//    console.log(signature, '---confirmed signature---');
//    return signature
//  };

//  /**
//   * Construct a Burn instruction
//   *
//   * @param programId SPL Token program account
//   * @param mint Mint for the account
//   * @param account Account to burn tokens from
//   * @param owner Owner of the account
//   * @param multiSigners Signing accounts if `authority` is a multiSig
//   * @param amount amount to burn
//   */
//   const createBurnInstruction = (
//    programId,
//    mint,
//    account,
//    owner,
//    multiSigners,
//    amount
//  ) => {
//    const dataLayout = BufferLayout.struct([
//      BufferLayout.u8('instruction'),
//      uint64('amount'),
//    ]);
//    const data = Buffer.alloc(dataLayout.span);
//    dataLayout.encode(
//      {
//        instruction: 8,
//        // Burn instruction
//        amount: new u64(amount).toBuffer(),
//      },
//      data
//    );
//    let keys = [
//      {
//        pubkey: account,
//        isSigner: false,
//        isWritable: true,
//      },
//      {
//        pubkey: mint,
//        isSigner: false,
//        isWritable: true,
//      },
//    ];

//    if (multiSigners.length === 0) {
//      keys.push({
//        pubkey: owner,
//        isSigner: true,
//        isWritable: false,
//      });
//    } else {
//      keys.push({
//        pubkey: owner,
//        isSigner: false,
//        isWritable: false,
//      });
//      multiSigners.forEach((signer) =>
//        keys.push({
//          pubkey: signer.publicKey,
//          isSigner: true,
//          isWritable: false,
//        })
//      );
//    }

//    return new TransactionInstruction({
//      keys,
//      programId: programId,
//      data,
//    });
//  };