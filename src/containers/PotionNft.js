import {
  Button,
  Card,
  Form,
  Input,
  Upload,
  Row,
  Col,
  notification,
  Alert,
  Result,
  Radio,
  InputNumber,
  DatePicker,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "antd/lib/form/Form";
import { useContext, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import * as anchor from "@project-serum/anchor";

import { uploadMetadataToIpfs, mint } from "../utils/mint";

import RuggedNftIdl from "../idl/rugged_nft.json";

const RUGGED_NFT_PROGRAM_ID = new anchor.web3.PublicKey(
  "DYvtKwZ7PMmD26dqgGQ7mfnXcqompTPVfN4GUTGWSgQi"
);

const NFT_SYMBOL = "rugged-nft";

const PotionNft = () => {
  let navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form] = useForm();
  const [imageFileBuffer, setImageFileBuffer] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const onCreate = async (values) => {
    console.log("Connection: ", connection);
    console.log("Wallet: ", wallet);

    let name = "Potion Nft";
    let uploadedMetatdataUrl = await uploadMetadataToIpfs({
      name: "Potion NFT",
      symbol: NFT_SYMBOL,
      description: "Potion Nft",
      image: 'https://ipfs.io/ipfs/bafkreigoqezusz63xka3hlsfy4pxhqyjmiahqvmgutth3dylc6iirjpgti',
      attributes: [],
    });
    if (uploadedMetatdataUrl == null) return;
    console.log("Uploaded meta data url: ", uploadedMetatdataUrl);

    setMinting(true);
    const result = await mint(
      connection,
      wallet,
      name,
      NFT_SYMBOL,
      uploadedMetatdataUrl,
      RUGGED_NFT_PROGRAM_ID,
      RuggedNftIdl
    );
    setMinting(false);
    setMintSuccess(result);
  };

  const onMintAgain = () => {
    setMintSuccess(false);
    form.resetFields();
  };

  if (mintSuccess) {
    return (
      <Result
        style={{ marginTop: 60 }}
        status="success"
        title="Successfully minted new NFT!"
        subTitle="You can check this new NFT in your wallet."
        extra={[
          <Button key="buy" onClick={onMintAgain}>
            Mint Again
          </Button>,
        ]}
      />
    );
  }

  return (
    <Row style={{ margin: 60 }}>
      {minting && (
        <Col span={16} offset={4}>
          <Alert message="Minting..." type="info" showIcon />
        </Col>
      )}
      {uploading && (
        <Col span={16} offset={4}>
          <Alert message="Uploading image..." type="info" showIcon />
        </Col>
      )}
      <Col span={16} offset={4} style={{ marginTop: 10 }}>
        <Card title="Mint Potion NFT">
          <Form
            form={form}
            layout="vertical"
            labelCol={8}
            wrapperCol={16}
            onFinish={onCreate}
          >
            <Row gutter={24}>
              <Col xl={12} span={24}>
                <img
                  src={require("../images/potion-nft.png")}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col
                xl={12}
                span={24}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{ width: 300 }}
                  shape="round"
                  size="large"
                >
                  Mint
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default PotionNft;
