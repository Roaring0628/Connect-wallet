import { Layout, Row, Col, Menu } from "antd";
import { Content, Footer, Header } from "antd/lib/layout/layout";
import Minter from "../containers/Minter";
import PotionNft from "../containers/PotionNft";
import GenesisMinter from "../containers/GenesisMinter";
import Home from "../containers/Home";
import WrongNetwork from "../containers/WrongNetwork";
import logo from "../images/sol.png";
import { Route, Routes,  useNavigate} from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

const AppLayout = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate()

  return (
    <Row>
      <Col span={24}>
        <Layout style={{ minHeight: "100vh" }}>
          <Header>
            <Row align="stretch" gutter={20}>
              <Col>
                <h1>
                  <font color="white">Rugged Revenants</font>
                </h1>
              </Col>
              <Col flex="auto">
                <Menu mode="horizontal" defaultSelectedKeys={['home']}>
                  <Menu.Item key="home" onClick={()=>navigate('/')}>Home</Menu.Item>
                  <Menu.Item key="rugged-nft" onClick={()=>navigate('/rugged-nft')}>Rugged NFT</Menu.Item>
                  <Menu.Item key="genesis-nft" onClick={()=>navigate('/genesis-nft')}>Genesis NFT</Menu.Item>
                  <Menu.Item key="potion-nft" onClick={()=>navigate('/potion-nft')}>Potion NFT</Menu.Item>
                  <Menu.Item key="game" onClick={()=>navigate('/game')}>Game</Menu.Item>
                </Menu>
              </Col>
              <Col style={{ marginRight: 10 }}>
                <WalletMultiButton className="wallet-button" />
              </Col>
            </Row>
          </Header>
          <Content>
            {connected && publicKey != null && (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rugged-nft" element={<Minter />} />
                <Route path="/potion-nft" element={<PotionNft />} />
                <Route path="/genesis-nft" element={<GenesisMinter />} />
              </Routes>
            )}
            {connected == false && <WrongNetwork />}
            {connected && publicKey == null && <WrongNetwork />}
          </Content>
          <Footer
            style={{
              position: "sticky",
              bottom: 0,
            }}
          >            
          </Footer>
        </Layout>
      </Col>
    </Row>
  );
};

export default AppLayout;
