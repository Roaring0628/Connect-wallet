import {
  Button,
  Card,
  Form,
  Row,
  Col,
  Alert,
  Result,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "antd/lib/form/Form";
import { useContext, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { mintGenesis } from "../utils/mint";


const Minter = () => {
  let navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form] = useForm();

  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const onCreate = async (values) => {
    console.log("Connection: ", connection);
    console.log("Wallet: ", wallet);

    setMinting(true);
    const result = await mintGenesis(wallet);
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
        <Card title="Mint Genesis NFT">
          <Form
            form={form}
            layout="vertical"
            labelCol={8}
            wrapperCol={16}
            onFinish={onCreate}
          >
            <Row gutter={24}>
              <Col xl={12} span={24}>
                <img src={require("../images/genesis-nft.png")} style={{width:'100%'}}/>
              </Col>
              <Col xl={12} span={24} style={{display:'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Button type="primary" htmlType="submit" style={{ width: 200 }} shape="round" size="large">
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

export default Minter;
