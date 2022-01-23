/* global chrome */
import React from "react";
import "./App.css";
import { Tree } from "antd";
import { Card } from "antd";
import Icon from "@ant-design/icons";
import { GithubOutlined } from '@ant-design/icons';

function flatTreeToMap(roots) {
  let result = {};
  function each(nodes) {
    for (let node of nodes) {
      if (node.children) {
        result[node.id] = node;
        each(node.children);
      }
    }
  }
  each(roots);
  return result;
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      roots: [],
    };
  }
  componentDidMount() {
    this.fetchTabs();
  }

  async fetchTabs() {
    let that = this;
    chrome.storage.local.get(["roots"], function (result) {
      let roots = result.roots;
      let tabMap = flatTreeToMap(roots);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          tabMap[tab.id].title = tab.title;
          tabMap[tab.id].icon = (
            <Icon
              component={() => (
                <img
                  src={tab.favIconUrl}
                  alt="favicon"
                  style={{
                    width: "1rem",
                    height: "1rem",
                    display: "inline-block",
                  }}
                />
              )}
            />
          );
        });
        console.log("roots", roots);
        console.log("tabMap", tabMap);
        that.setState({ roots,tabMap });
      });
    });
  }
  render() {
    return (
      <div className="App">
        <Card
          title="Tab Tree"
          extra={<a href="https://github.com/gaoliang/tab-tree"  target={'_blank'} rel="noreferrer"><GithubOutlined /></a>}
          style={{ width: 600 }}
        >
          {this.state.roots.length > 0 ? (
            <Tree
              fieldNames={{ title: "title", key: "id", children: "children" }}
              showIcon
              showLine={{ showLeafIcon: false }}
              blockNode
              defaultExpandAll
              treeData={this.state.roots}
              onSelect={function(selectedKeys) {chrome.tabs.update(selectedKeys[0], {active: true})}}
            />
          ) : ( "暂无数据" )}
        </Card>
      </div>
    );
  }
}

export default App;
