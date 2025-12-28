import React, { Component } from "react";
import "./App.css";
import { Tree, Card, Image } from "antd";
import { DownOutlined, GithubOutlined, CloseCircleOutlined } from "@ant-design/icons";
import faviconNewtabIcon from './favicon_newtab.png';

interface TabObj {
  id: number;
  windowId: number;
  openerTabId?: number;
  children: TabObj[];
  title?: string;
  favIconUrl?: string;
}

interface AppState {
  value: null;
  roots: TabObj[];
  tabMap: Record<number, TabObj>;
}

function buildTabObj(chromeTab: chrome.tabs.Tab): TabObj {
  console.log("chromeTab: ", chromeTab)
  let tabObj: TabObj = {
    id: chromeTab.id!, 
    windowId: chromeTab.windowId,
    openerTabId: chromeTab.openerTabId,
    children: [],
    title: chromeTab.title,
    favIconUrl: chromeTab.favIconUrl
  }
  return tabObj;
}

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      value: null,
      roots: [],
      tabMap: {}
    };
  }
  
  componentDidMount() {
    this.initTree();
  }

  initTree() {
    let tabMap: Record<number, TabObj> = {}
    let roots: TabObj[] = []
    chrome.tabs.query({}, tabs =>  {
        chrome.storage.local.get(['openerTabIdMap'], result =>  {
          let openerTabIdMap = result.openerTabIdMap || {}

          // 1. Create all TabObjs
          tabs.forEach(tab => {
            if (!tab.id) return;
            let tabObj = buildTabObj(tab);
            // Use stored openerTabId if available
            if (openerTabIdMap[tab.id]) {
                tabObj.openerTabId = openerTabIdMap[tab.id];
            }
            tabMap[tabObj.id] = tabObj;
          });

          // 2. Link them
          Object.values(tabMap).forEach(tabObj => {
             if (tabObj.openerTabId && tabMap[tabObj.openerTabId]) {
                 tabMap[tabObj.openerTabId].children.push(tabObj);
             } else {
                 roots.push(tabObj);
             }
          });

          this.setState({ roots, tabMap });
        })
      }
    )
  }
  
  closeTabInner(tabId: number) {
      let currentTab = this.state.tabMap[tabId];
      if (!currentTab) return;
      
      let visited: number[] = [], queue: TabObj[] = [];
      queue.push(currentTab);
      while (queue.length) {
        currentTab = queue.shift()!;
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
              titleRender = {(nodeData: any) => {
                  const node = nodeData as TabObj;
                  return (<div style={{display: 'flex', justifyContent: 'space-between', }}>
              <div className="tree-node-title" onClick={() => {chrome.tabs.update(node.id, {active: true})}}>
                  <Image
                  width={'1rem'}
                  height={'1rem'}
                  preview={false}
                  src={node.favIconUrl}
                  fallback={faviconNewtabIcon}
                />
                {node.title}
              </div>
              <div onClick={() => {this.closeTabInner(node.id)}}>
                <CloseCircleOutlined />
              </div>
              
              </div>)}}
            />
          ) : ( "暂无数据" )}
        </Card>
      </div>
    );
  }
}

export default App;
