import React from "react";
import injectSheet from "react-jss";
import PropTypes from "prop-types";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Grid from "react-bootstrap/lib/Grid";
import FormGroup from "react-bootstrap/lib/FormGroup";
import FormControl from "react-bootstrap/lib/FormControl";
import Glyphicon from "react-bootstrap/lib/Glyphicon";
import MenuItem from "react-bootstrap/lib/MenuItem";
import DropdownButton from "react-bootstrap/lib/DropdownButton";
import { react } from "@nosplatform/api-functions";
import { u, wallet } from "@cityofzion/neon-js";
import { unhexlify } from "binascii";
// import { nosPropTypes } from "@nosplatform/api-functions/es6";
// import { injectNOS } from "../../nos";
import ChatMenu from "./../../components/ChatMenu";
import ChatContent from "./../../components/ChatContent";
import NosGrey from "./../../nos_grey.svg";
import NeoLogo from "./../../neo.svg";

const { injectNOS, nosProps } = react.default;
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      recvCount: 0,
      sendCount: 0,
      chatMessages: {},
      activeAddress: "welcome",
      userAddress: "",
      menu: {},
      filteredMessages: [],
      scriptHash: "93ca2361022cc2d82808c5b9fdf7f47c95c03cd4"
    };
  }
  componentDidMount() {
    this.props.nos.getAddress().then(address => {
      this.setState({
        userAddress: address
      });
    });
  }
  getDateTime = unixTimestamp => {
    const date = new Date(unixTimestamp * 1000);
    const hours = date.getHours();
    const minutes = `0${date.getMinutes()}`;
    const seconds = `0${date.getSeconds()}`;
    return `${date.toLocaleDateString()} ${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
  };
  getMessageCount = async () => {
    await this.getRecvCount(this.state.scriptHash, this.state.userAddress);
    await this.getSendCount(this.state.scriptHash, this.state.userAddress);
  };
  getRecvCount = async (scriptHash, addr) => {
    await this.handleGetStorage(
      scriptHash,
      `${unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(addr)))}.receive.latest`,
      true,
      false
    )
      .then(data => {
        this.setState({
          recvCount: parseInt(data, 16)
        });
      })
      .catch(err => alert(`Error: ${err.message}`));
  };
  getSendCount = async (scriptHash, addr) => {
    await this.handleGetStorage(
      scriptHash,
      `${unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(addr)))}.send.latest`,
      true,
      false
    )
      .then(data => {
        this.setState({
          sendCount: parseInt(data, 16)
        });
      })
      .catch(err => alert(`Error: ${err.message}`));
  };

  concatBytes = (source, start, length) => {
    let temp = "";
    for (let i = start; i < length; i += 1) temp += source[i];
    return temp;
  };
  createChat = addr => {
    // var timestamp = (new Date()).getTime();
    // var chat = addr + "-" + timestamp;
    this.state.menu[addr] = addr;
    this.setState({ menu: this.state.menu });
  };

  handleClick = e => {
    const clickKey = e;
    if (clickKey.length === 34) {
      // address handle chat filtered state messages
      console.log("OK");
      const sortable = [];
      // send messages
      if (this.state.chatMessages.send[clickKey] !== undefined) {
        for (let i = 0; i < this.state.chatMessages.send[clickKey].length; i += 1) {
          console.log(`send${i}`);
          // for(var [key,message,time] in this.state.chatMessages["send"][e.key]){
          // console.log(JSON.stringify(key));
          const tmp = this.state.chatMessages.send[clickKey][i];

          const { key, time, message, direction } = tmp;
          const dateTime = this.getDateTime(tmp.time);
          // const key = this.state.chatMessages.send[clickKey][i].key;
          // const time = this.state.chatMessages.send[clickKey][i].time;
          // const message = this.state.chatMessages.send[clickKey][i].message;
          // const direction = this.state.chatMessages.send[clickKey][i].direction;
          // const dateTime = this.getDateTime(this.state.chatMessages.send[clickKey][i].time);
          sortable.push({
            key,
            time,
            message,
            direction,
            dateTime
          });
        }
      }
      // receive messages
      if (this.state.chatMessages.receive[clickKey] !== undefined) {
        for (let i = 0; i < this.state.chatMessages.receive[clickKey].length; i += 1) {
          console.log(`recv${i}`);
          // for(var [key,message,time] in this.state.chatMessages["send"][e.key]){
          // console.log(JSON.stringify(key));
          const tmp = this.state.chatMessages.receive[clickKey][i];

          const { key, time, message, direction } = tmp;
          const dateTime = this.getDateTime(tmp.time);

          // var key = this.state.chatMessages.receive[clickKey][i].key;
          // var time = this.state.chatMessages.receive[clickKey][i].time;
          // var message = this.state.chatMessages.receive[clickKey][i].message;
          // var direction = this.state.chatMessages.receive[clickKey][i].direction;
          // var dateTime = this.getDateTime(this.state.chatMessages.receive[clickKey][i].time);
          sortable.push({
            key,
            time,
            message,
            direction,
            dateTime
          });
        }
      }
      sortable.sort((a, b) => a.time - b.time);
      console.log(`Set sorted by time messages for ${clickKey} :${JSON.stringify(sortable)}`);
      this.setState({ filteredMessages: sortable });
    } else if (clickKey === "reload") {
      this.setState({ filteredMessages: [] });

      this.getMessageCount().then(() => {
        // console.log("recv:" + this.state.recvCount + "send:" + this.state.sendCount);
        this.fetchMessages(
          this.state.scriptHash,
          this.state.userAddress,
          this.state.recvCount,
          this.state.sendCount
        );
      });
    } else {
      this.setState({ filteredMessages: [] });
    }
    this.setState({ activeAddress: clickKey });
  };
  /**
   * Deserializes a serialized array that's passed as a hexstring
   * @param {hexstring} rawData
   */
  deserialize = rawData => {
    // Split into bytes of 2 characters
    const rawSplitted = rawData.match(/.{2}/g);
    // console.log(rawSplitted);
    // see https://github.com/neo-project/neo/blob/master/neo/SmartContract/StackItemType.cs for data types
    /*
        ByteArray = 0x00,
        Boolean = 0x01,
        Integer = 0x02,
        InteropInterface = 0x40,
        Array = 0x80,
        Struct = 0x81,
        Map = 0x82,
    */
    // skip 80 (array) => we do only array

    // the array length
    const arrayLen = parseInt(rawSplitted[1], 16);
    // console.log("arrayLen" + arrayLen);
    let offset = 2;
    const rawArray = [];

    for (let i = 0; i < arrayLen; i += 1) {
      // get item type
      const itemType = parseInt(rawSplitted[offset], 16);
      // console.log("itemtype" + itemType)
      offset += 1;

      // get item length
      let itemLength = parseInt(rawSplitted[offset], 16);
      // serialize: https://github.com/neo-project/neo-vm/blob/master/src/neo-vm/Helper.cs#L41-L64
      offset += 1;
      if (itemLength === 253) {
        // new itemlentgh = reverse int of next 2
        itemLength = parseInt(u.reverseHex(this.concatBytes(rawSplitted, offset, offset + 2)), 16);
        offset += 2;

        /* d
          writer.Write((byte)0xFD);
          writer.Write((ushort)value);
        */
        /* s
        value = reader.ReadUInt16();
       */
      } else if (itemLength === 254) {
        // new itemlentgh = reverse int of next 4
        itemLength = parseInt(u.reverseHex(this.concatBytes(rawSplitted, offset, offset + 2)), 16);
        offset += 4;
        /* d
          writer.Write((byte)0xFE);
          writer.Write((uint)value);
        */
        /* s
       value = reader.ReadUInt32();
       */
      } else if (itemLength === 255) {
        // new itemlentgh = reverse int of next 8
        itemLength = parseInt(u.reverseHex(this.concatBytes(rawSplitted, offset, offset + 2)), 16);
        offset += 8;
        /* d
          writer.Write((byte)0xFF);
          writer.Write(value); */
        /* s
          value = reader.ReadUInt64();
          */
      } else {
        /* d
           writer.Write((byte)value);
          */
        /* s
          value = fb;
         */
      }
      // console.log("itemLength" + itemLength)
      // console.log(offset);
      let data = this.concatBytes(rawSplitted, offset, itemLength + offset);
      // console.log(data);
      if (itemType === 2) {
        // console.log("data: " + parseInt(u.reverseHex(data),16));
        data = u.reverseHex(data);
        // console.log ("TIME" + data);
      } else if (itemType === 0) {
        // [unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(this.state.userAddress))),
        // data = hexlify(u.reverseHex(wallet.getAddressFromScriptHash))
        if (i === 0) {
          // console.log(u.hexstring2str(data));
          data = u.hexstring2str(data);
        } else {
          data = wallet.getAddressFromScriptHash(u.reverseHex(data));
          // console.log(wallet.getAddressFromScriptHash(u.reverseHex(data)));
        }
      }
      rawArray.push(data);
      // console.log("pushed to array")
      offset = itemLength + offset;
      // console.log("new offset" + offset);
    }
    // 0:message
    // 1:time
    // 2:addr
    return rawArray;
  };
  fetchMessages = async (scriptHash, addr, recvCount, sendCount) => {
    // console.log(`ASF${recvCount}`);
    const { createChat } = this;
    // get received messages
    // console.log(`Getting ${recvCount} received messages`);
    const tmp = {
      send: {},
      receive: {}
    };
    let deserialized = [];
    let promises = [];
    const { deserialize } = this;
    if (recvCount > 0) {
      promises = [];
      for (let i = 0; i < recvCount; i += 1) {
        promises.push(
          this.handleGetStorage(
            scriptHash,
            `${unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(addr)))}.receive.${unhexlify(
              u.int2hex(i + 1)
            )}`,
            true,
            false
          )
        );
      }

      Promise.all(promises).then(results => {
        let count = 0;
        results.forEach(entry => {
          deserialized = [];
          deserialized = deserialize(entry);
          const msgD = deserialized[0];
          const timeD = parseInt(deserialized[1], 16);
          const addrD = deserialized[2];
          console.log(`MESSAGE ${msgD}`);
          console.log(`TIME ${timeD}`);
          console.log(`ADDRESS ${addrD}`);
          if (tmp.receive[addrD] === undefined) {
            count = 0;
            tmp.receive[addrD] = [{}];
          }
          tmp.receive[addrD][count] = {
            key: `receive${count}`,
            message: msgD,
            time: timeD,
            direction: "receive"
          };
          createChat(addrD);
          count += 1;
        });
        console.log(`Received messages: ${JSON.stringify(tmp.receive)}`);
        this.state.chatMessages = tmp;
        this.setState({ chatMessages: this.state.chatMessages });
      });
    }
    // get send messages
    console.log(`Getting ${sendCount} sent messages`);
    if (sendCount > 0) {
      promises = [];
      for (let i = 0; i < sendCount; i += 1) {
        promises.push(
          this.handleGetStorage(
            scriptHash,
            `${unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(addr)))}.send.${unhexlify(
              u.int2hex(i + 1)
            )}`,
            true,
            false
          )
        );
      }
      Promise.all(promises).then(results => {
        let count = 0;
        results.forEach(entry => {
          deserialized = [];

          deserialized = deserialize(entry);
          const msgD = deserialized[0];
          const timeD = parseInt(deserialized[1], 16);
          const addrD = deserialized[2];

          if (tmp.send[addrD] === undefined) {
            count = 0;
            console.log("here");
            tmp.send[addrD] = [{}];
          }
          tmp.send[addrD][count] = {
            key: `send${count}`,
            message: msgD,
            time: timeD,
            direction: "send"
          };
          createChat(addrD);
          count += 1;
        });
        console.log(`Sent messages:${JSON.stringify(tmp.send)}`);
        this.state.chatMessages = tmp;
        this.setState({ chatMessages: this.state.chatMessages });
      });
    }
  };
  handleInvoke = (scriptHash, operation, args) =>
    this.props.nos
      .invoke({ scriptHash, operation, args })
      .then(txid => alert(`Invoke txid: ${txid} `))
      .catch(err => alert(`Error: ${err.message}`));

  handleGetStorage = async (scriptHash, key, encodeInput, decodeOutput) =>
    this.props.nos
      .getStorage({ scriptHash, key, encodeInput, decodeOutput })
      .catch(err => alert(`Error: ${err.message}`));

  invokeSendChat = (addr, message) => {
    console.log("Invoke 'sendMessage'");
    console.log(`from: ${this.state.userAddress}`);
    console.log(`to: ${addr}`);
    console.log(`message: ${message}`);
    this.handleInvoke(this.state.scriptHash, "sendMessage", [
      unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(this.state.userAddress))),
      unhexlify(u.reverseHex(wallet.getScriptHashFromAddress(addr))),
      message,
      message
    ]);
  };
  render() {
    const { classes } = this.props;
    return (
      <Grid className={classes.neoChat}>
        <Row className={classes.neoChatBody}>
          <Col className={classes.sider} sm={4}>
            <div className={classes.siderMain}>
              <Row className={classes.chatHeader}>
                <Col className={classes.siderHeaderInner} sm={1}>
                  <div className={classes.siderHeaderLogo}>
                    <img alt="NeoLogo" className="img-responsive" src={NeoLogo} />
                  </div>
                </Col>
                <Col className={classes.siderHeaderInner} sm={10}>
                  <span className={classes.headerText5}>{this.state.userAddress}</span>
                </Col>
                <Col className={classes.siderHeaderInner} sm={1}>
                  <DropdownButton
                    bsStyle="default"
                    title={
                      <div style={{ display: "inline-block" }}>
                        <Glyphicon glyph="cog" />
                      </div>
                    }
                    noCaret
                    key="1"
                    bsSize="small"
                    id="dropdown-setting-1"
                  >
                    <MenuItem eventKey="reload" onSelect={this.handleClick}>
                      Load messages
                    </MenuItem>
                    <MenuItem eventKey="new" onSelect={this.handleClick}>
                      New message
                    </MenuItem>
                    <MenuItem divider />
                    <MenuItem eventKey="welcome" onSelect={this.handleClick}>
                      About
                    </MenuItem>
                  </DropdownButton>
                </Col>
              </Row>
              <Row className={classes.siderSearch}>
                <Col className={classes.siderSearchInner} sm={12}>
                  <FormGroup>
                    <FormControl
                      type="text"
                      placeholder="Search Address"
                      onChange={this.handleChange}
                    />
                  </FormGroup>
                </Col>
              </Row>
              <Row className={classes.siderChats}>
                <Col className={classes.siderChatsInner} sm={12}>
                  <ChatMenu
                    activeAddress={this.state.activeAddress}
                    menu={this.state.menu}
                    onClick={this.handleClick}
                    classes={classes}
                  />
                </Col>
              </Row>
            </div>
          </Col>
          <Col className={classes.chat} sm={8}>
            <ChatContent
              activeAddress={this.state.activeAddress}
              onInvokeSend={this.invokeSendChat}
              chatMessages={this.state.filteredMessages}
              classes={classes}
            />
          </Col>
        </Row>
      </Grid>
    );
  }
}

const styles = {
  "@import": "https://fonts.googleapis.com/css?family=Source+Sans+Pro",
  "@global html, body": {
    fontFamily: "Source Sans Pro",
    margin: 0,
    padding: 0,
    backgroundColor: "#f0f2f5"
  },
  App: {
    textAlign: "center"
  },
  intro: {
    fontSize: "large"
  },
  lineBreak: {
    width: "75%",
    borderTop: "1px solid #333333",
    margin: "32px auto"
  },
  neoChat: {
    overflow: "hidden",
    padding: 0,
    margin: "auto",
    top: `${19}px`,
    height: `calc(${100}vh - ${38}px)`,
    position: "relative",
    boxShadow: "0 1px 1px 0 rgba(0, 0, 0, .06), 0 2px 5px 0 rgba(0, 0, 0, .2)"
  },
  neoChatBody: {
    margin: 0,
    padding: 0,
    backgroundColor: "#f7f7f7",
    height: `${100}%`,
    overflow: "hidden"
  },
  sider: {
    height: `${100}%`,
    margin: 0,
    padding: 0
  },
  siderMain: {
    padding: 0,
    margin: 0,
    top: 0,
    height: `${100}%`
  },
  siderHeaderInner: {
    height: `${100}%`,
    padding: 0,
    margin: 0
  },
  siderSearch: {
    margin: 0,
    backgroundColor: "#f7f7f7",
    height: `${60}px`,
    padding: "10px 5px 10px 5px"
  },
  siderSearchInner: {},
  siderChats: {
    padding: 0,
    margin: 0,
    height: `calc(${100}% - ${120}px)`,
    overflowY: "auto",
    overflowX: "hidden",
    backgroundColor: "#fff",
    border: `${1}px solid #f7f7f7`
  },
  chatSearch: {
    width: `${100}%`
  },
  siderChatsInner: {
    padding: 0,
    margin: 0
  },
  siderChatBody: {
    height: `${65}px`,
    margin: 0,
    border: "none",
    borderBottom: `${1}px solid #f7f7f7`,
    position: "relative",
    padding: `${0}px`,
    borderTopLeftRadius: `${0}!important`,
    borderTopRightRadius: `${0}!important`,
    borderBottomLeftRadius: `${0}!important`,
    borderBottomRightRadius: `${0}!important`,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f2f2f2"
    }
  },
  noMargin: {
    margin: `${0}!important`
  },
  chat: {
    borderLeft: `${1}px solid rgba(0, 0, 0, .1);`,
    height: `${100}%`,
    // overflowY: "auto",
    margin: 0,
    padding: 0
  },
  chatHeader: {
    background: "#ececec",
    height: `${60}px`,
    margin: 0,
    zIndex: 447,
    padding: "10px 5px 10px 5px"
  },
  chatHeaderInner: {},
  chatMessages: {
    padding: 0,
    margin: 0,
    overflowY: "auto",
    height: `calc(${100}% - ${120}px)`,
    border: `${1}px solid #f7f7f7`,
    backgroundImage: `url(${NosGrey})`,
    backgroundSize: "cover"
  },
  chatMessagesBody: {
    padding: 0,
    margin: 0
  },
  message: {
    margin: 0,
    width: "auto",
    height: "auto",
    padding: "2px 20px"
  },
  messageReceive: {
    maxWidth: "80%"
  },
  messageSend: {
    maxWidth: "80%",
    marginLeft: "20%",
    padding: "2px 20px"
  },
  messageText: {
    margin: 0,
    padding: `${5}px`,
    fontSize: `${14}px`,
    wordWrap: "break-word",
    fontWeight: 200,
    paddingBottom: 0
  },
  messageTime: {
    margin: 0,
    fontSize: `${12}px`,
    textAlign: "right",
    color: "#949494",
    float: "right"
  },
  chatReply: {
    height: `${60}px`,
    backgroundColor: "#F0F0F0",
    margin: 0,
    padding: "10px 5px 10px 5px"
  },
  replyEmojis: {},
  welcomeFooter: {},
  replyInput: {},
  replySend: {},
  receiver: {
    width: "auto",
    background: "#FFF",
    display: "inline-block",
    wordWrap: "break-word",
    padding: "4px 10px 7px 10px",
    textShadow: "0 1px 1px rgba(0, 0, 0, .2)",
    borderRadius: "0 13px 13px 13px"
  },
  sender: {
    width: "auto",
    float: "right",
    background: "#DCF8C7",
    display: "inline-block",
    wordWrap: "break-word",
    padding: "4px 10px 7px 10px",
    textShadow: "0 1px 1px rgba(0, 0, 0, .2)",
    borderRadius: "13px 0 13px 13px"
  },
  siderHeaderLogo: {
    height: `${100}%`,
    width: `${100}%`,
    padding: 0,
    margin: 0
  },
  headerText2: {
    margin: `${0}px`,
    display: "block",
    fontSize: `${1.7}em`,
    fontWweight: "bold"
  },
  headerText3: {
    margin: `${0}px`,
    display: "block",
    fontSize: `${1.5}em`,
    fontWweight: "bold"
  },
  headerText4: {
    margin: `${0}px`,
    display: "block",
    fontSize: `${1.17}em`,
    fontWweight: "bold"
  },
  headerText5: {
    margin: `${0}px`,
    display: "block",
    fontSize: `${1}em`,
    fontWweight: "bold"
  }
};

/*
const App = ({ classes }) => (
  <div className={classes.App}>
    <Header title="A nOS dApp starter-kit!" />
    <p className={classes.intro}>
      To get started, edit <code>src/views/App/index.js</code> and save to reload.
    </p>
    <p className={classes.intro}>Or test out the following demo functions!</p>
    <hr className={classes.lineBreak} />
    <NOSActions />
  </div>
);

*/
App.propTypes = {
  classes: PropTypes.objectOf(PropTypes.any).isRequired,
  nos: nosProps.isRequired
};

export default injectNOS(injectSheet(styles)(App));

// export default injectStore((App));
