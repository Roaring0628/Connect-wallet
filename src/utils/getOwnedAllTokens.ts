import {AccountLayout, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {clusterApiUrl, Connection, PublicKey} from "@solana/web3.js";

(async () => {

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    new PublicKey('SPp6PsdFNiKZXKwkNdWBppkRVaXM81t5KjdeHfdrDCp'),
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  console.log("Token                                         Balance");
  console.log("------------------------------------------------------------");
  tokenAccounts.value.forEach((e) => {
    const accountInfo = AccountLayout.decode(e.account.data);
    console.log('accountInfo', accountInfo)
    console.log(`${new PublicKey(accountInfo.mint)}   ${accountInfo.amount}`);
  })

})();
