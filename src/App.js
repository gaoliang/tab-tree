/* global chrome */
import React from "react";
import "./App.css";
import { Tree } from "antd";
import {
  DownOutlined
} from "@ant-design/icons";

function flatTreeToMap(roots) {
  let result = {}
  function each(nodes){
    for(let node of nodes){
     if(node.children){
        result[node.id] = node
        each(node.children);
     }
   }
 }
 each(roots)
 return result;
}


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      treeData:  []
    };
  }
  componentDidMount() {
    this.fetchTabs();
  }

  async fetchTabs() {
    let that = this;
    chrome.storage.local.get(["roots"], function (result) {
      let roots = result.roots;
      let tabMap =  flatTreeToMap(roots)
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          tabMap[tab.id].title = tab.title
        });
        console.log("roots", roots)
        console.log("tabMap", tabMap)
        that.setState({
          treeData: result.roots
        })
      })
    });
  }
  render() {
    return (
      <div className="App">
        <Tree
          fieldNames = {{title: 'title', key: 'id', children: 'children'}}
          showIcon
          showLine
          blockNode
          icon = {(props) => {<div>hello</div>}}
          switcherIcon={<DownOutlined />}
          treeData={this.state.treeData}
        />
      </div>
    );
  }
}

export default App;
