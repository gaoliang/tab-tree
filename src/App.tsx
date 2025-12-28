import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./App.css";
import { Tree, Input, Spin, Empty, Dropdown, MenuProps } from "antd";
import { 
  CloseOutlined, 
  SearchOutlined, 
  CaretRightOutlined, 
  MoreOutlined,
  DeleteOutlined,
  MinusOutlined,
  ExportOutlined,
  GithubOutlined
} from "@ant-design/icons";
import faviconNewtabIcon from './favicon_newtab.png';

interface TabObj {
  id: number;
  windowId: number;
  openerTabId?: number;
  children: TabObj[];
  title?: string;
  favIconUrl?: string;
  active?: boolean;
  url?: string;
}

function buildTabObj(chromeTab: chrome.tabs.Tab): TabObj {
  return {
    id: chromeTab.id!,
    windowId: chromeTab.windowId,
    openerTabId: chromeTab.openerTabId,
    children: [],
    title: chromeTab.title,
    favIconUrl: chromeTab.favIconUrl,
    active: chromeTab.active,
    url: chromeTab.url
  };
}

const getDomain = (url?: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (e) {
    return url;
  }
};

const filterTreeData = (nodes: TabObj[], searchValue: string): TabObj[] => {
  if (!searchValue) return nodes;
  return nodes.map(node => {
    const children = filterTreeData(node.children, searchValue);
    const match = (node.title?.toLowerCase().includes(searchValue.toLowerCase()) || 
                   node.url?.toLowerCase().includes(searchValue.toLowerCase()));
    if (match || children.length > 0) {
      return { ...node, children };
    }
    return null;
  }).filter((n): n is TabObj => n !== null);
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [roots, setRoots] = useState<TabObj[]>([]);
  const [tabMap, setTabMap] = useState<Record<number, TabObj>>({});
  const [activeKeys, setActiveKeys] = useState<number[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const initTree = useCallback(() => {
    setLoading(true);
    chrome.tabs.query({}, (tabs) => {
      chrome.storage.local.get(['openerTabIdMap'], (result) => {
        const openerTabIdMap = result.openerTabIdMap || {};
        const newTabMap: Record<number, TabObj> = {};
        const newRoots: TabObj[] = [];
        const newActiveKeys: number[] = [];

        // 1. Create all TabObjs
        tabs.forEach((tab) => {
          if (!tab.id) return;
          const tabObj = buildTabObj(tab);
          // Use stored openerTabId if available
          if (openerTabIdMap[tab.id]) {
            tabObj.openerTabId = openerTabIdMap[tab.id];
          }
          newTabMap[tabObj.id] = tabObj;
          if (tab.active) {
            newActiveKeys.push(tab.id);
          }
        });

        // 2. Link them
        Object.values(newTabMap).forEach((tabObj) => {
          if (tabObj.openerTabId && newTabMap[tabObj.openerTabId]) {
            newTabMap[tabObj.openerTabId].children.push(tabObj);
          } else {
            newRoots.push(tabObj);
          }
        });

        setRoots(newRoots);
        setTabMap(newTabMap);
        setActiveKeys(newActiveKeys);
        setExpandedKeys(Object.keys(newTabMap).map(Number)); // Expand all by default
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    initTree();
  }, [initTree]);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchValue(value);
    setAutoExpandParent(true);
    if (value) {
       // Expand all nodes when searching
       setExpandedKeys(Object.keys(tabMap).map(Number));
    } else {
       // When search is cleared, keep all expanded (default view)
       setExpandedKeys(Object.keys(tabMap).map(Number));
    }
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const getAllIds = (node: TabObj): number[] => {
    let visited: number[] = [], queue: TabObj[] = [];
    queue.push(node);
    while (queue.length) {
      const current = queue.shift()!;
      visited.push(current.id);
      if (current.children) queue.push(...current.children);
    }
    return visited;
  };

  const closeTabOnly = (node: TabObj) => {
    chrome.tabs.remove(node.id, () => initTree());
  };

  const closeTabTree = (node: TabObj) => {
    const ids = getAllIds(node);
    chrome.tabs.remove(ids, () => initTree());
  };

  const closeChildrenOnly = (node: TabObj) => {
    const ids = getAllIds(node).filter(id => id !== node.id);
    if (ids.length > 0) {
      chrome.tabs.remove(ids, () => initTree());
    }
  };

  const moveTreeToNewWindow = (node: TabObj) => {
    const allIds = getAllIds(node);
    if (allIds.length === 0) return;
    
    chrome.windows.create({ tabId: node.id, focused: true }, (newWindow) => {
      if (!newWindow || !newWindow.id) return;
      const childrenIds = allIds.filter(id => id !== node.id);
      if (childrenIds.length > 0) {
        chrome.tabs.move(childrenIds, { windowId: newWindow.id, index: -1 }, () => {
          initTree();
        });
      } else {
        initTree();
      }
    });
  };

  const renderTabTitle = (nodeData: any) => {
    const node = nodeData as TabObj;
    const domain = getDomain(node.url);
    
    const menuItems: MenuProps['items'] = [
      {
        key: 'close-tree',
        label: chrome.i18n.getMessage('closeTree'),
        icon: <CloseOutlined />,
        danger: true,
        onClick: (e) => { e.domEvent.stopPropagation(); closeTabTree(node); }
      },
      {
        key: 'close-current',
        label: chrome.i18n.getMessage('closeCurrent'),
        icon: <MinusOutlined />,
        onClick: (e) => { e.domEvent.stopPropagation(); closeTabOnly(node); }
      },
      {
        key: 'close-children',
        label: chrome.i18n.getMessage('closeChildren'),
        icon: <DeleteOutlined />,
        disabled: !node.children || node.children.length === 0,
        onClick: (e) => { e.domEvent.stopPropagation(); closeChildrenOnly(node); }
      },
      {
        type: 'divider',
      },
      {
        key: 'move-window',
        label: chrome.i18n.getMessage('moveToNewWindow'),
        icon: <ExportOutlined />,
        onClick: (e) => { e.domEvent.stopPropagation(); moveTreeToNewWindow(node); }
      }
    ];

    return (
      <div className="chrome-tab-item">
        <div className="chrome-tab-content" onClick={() => { chrome.tabs.update(node.id, { active: true }) }}>
          <div className="chrome-tab-favicon-wrapper">
             <img
               className="chrome-tab-favicon"
               src={node.favIconUrl || faviconNewtabIcon}
               alt=""
               onError={(e) => { (e.target as HTMLImageElement).src = faviconNewtabIcon; }}
             />
          </div>
          <div className="chrome-tab-info">
             <div className="chrome-tab-title" title={node.title}>{node.title}</div>
             <div className="chrome-tab-domain">{domain}</div>
          </div>
        </div>
        <div className="action-btn" onClick={(e) => e.stopPropagation()}>
           <div 
             className="icon-btn close-tree-btn" 
             title={chrome.i18n.getMessage('closeTree')}
             onClick={(e) => { e.stopPropagation(); closeTabTree(node); }}
           >
             <CloseOutlined />
           </div>
           <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight" arrow>
              <div className="icon-btn more-btn">
                 <MoreOutlined />
              </div>
           </Dropdown>
        </div>
      </div>
    );
  };

  const treeData = useMemo(() => filterTreeData(roots, searchValue), [roots, searchValue]);

  return (
    <div className="App">
      <div className="search-bar-container">
         <Input 
            placeholder={chrome.i18n.getMessage('searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
            onChange={onSearch}
            bordered={false}
            className="chrome-search-input"
            style={{ flex: 1 }}
         />
         <a 
            href="https://github.com/gaoliang/tab-tree" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-link"
            title={chrome.i18n.getMessage('sourceCode')}
         >
            <GithubOutlined style={{ fontSize: '20px', color: '#5f6368' }} />
         </a>
      </div>
      <div className="tree-container">  
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : treeData.length > 0 ? (
          <Tree
            fieldNames={{ title: "title", key: "id", children: "children" }}
            showLine={false}
            switcherIcon={<CaretRightOutlined />}
            blockNode
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            defaultExpandAll
            treeData={treeData}
            selectedKeys={activeKeys}
            titleRender={renderTabTitle}
            height={500} // Virtual scroll for performance
            itemHeight={40} // Reduced height
          />
        ) : (
          <Empty description={chrome.i18n.getMessage('emptyState')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }} />
        )}
      </div>
    </div>
  );
};

export default App;
