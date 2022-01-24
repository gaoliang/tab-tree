/* global chrome */
import React from "react";
import "./App.css";
import { Tree, Card, Image } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { GithubOutlined, CloseCircleOutlined } from '@ant-design/icons';
import faviconNewtabIcon from './favicon_newtab.png';

function buildTabObj(chromeTab) {
  console.log("chromeTab: ", chromeTab)
  let tabObj = {
    id: chromeTab.id, 
    windowId: chromeTab.windowId,
    openerTabId: chromeTab.openerTabId,
    children: [],
    title: chromeTab.title,
    favIconUrl: chromeTab.favIconUrl
  }
  return tabObj;
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
    this.initTree();
  }

  initTree() {
    let tabMap = {}
    let roots = []
    chrome.tabs.query({}, tabs =>  {
        chrome.storage.local.get(['openerTabIdMap'], result =>  {
          let openerTabIdMap = result.openerTabIdMap || {}
          tabs.forEach(tab => {
            let tabObj = buildTabObj(tab)
            tabObj.openerTabId = openerTabIdMap[tab.id]
            tabMap[tabObj.id] = tabObj
            if(tabObj.openerTabId) {
              tabMap[tabObj.openerTabId].children.push(tabObj)
            } else {
              roots.push(tabObj)
            }
          })
          this.setState({ roots, tabMap });
        })
      }
    )
  }
  
  closeTabInner(tabId) {
      let currentTab = this.state.tabMap[tabId];
      let visited = [], queue = [];
      queue.push(currentTab);
      while (queue.length) {
        currentTab = queue.shift();
        visited.push(currentTab.id);
        if (currentTab.children) queue.push(...currentTab.children);
      };
      chrome.tabs.remove(visited, () => {
        this.initTree()
      }) 
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
              // showIcon
              showLine={{ showLeafIcon: false }}
              switcherIcon={<DownOutlined />}
              blockNode
              defaultExpandAll
              treeData={this.state.roots}
              titleRender = {(nodeData) => (<div style={{display: 'flex', 'justify-content': 'space-between', }}>
              <div className="tree-node-title" onClick={() => {chrome.tabs.update(nodeData.id, {active: true})}}>
                  <Image
                  width={'1rem'}
                  height={'1rem'}
                  preview={false}
                  src={nodeData.favIconUrl}
                  fallback={faviconNewtabIcon}
                />
                {nodeData.title}
              </div>
              <div onClick={() => {this.closeTabInner(nodeData.id)}}>
                <CloseCircleOutlined />
              </div>
              
              </div>)}
            />
          ) : ( "暂无数据" )}
        </Card>
      </div>
    );
  }
}

export default App;
