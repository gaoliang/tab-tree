/* global chrome */
let roots = []
let tabMap = {}

function init() {
  chrome.tabs.query(
    {}, function (tabs)  {
      tabs.forEach(tab => {
        var tabObj = {
          id: tab.id, 
          windowId: tab.windowId,
          children: []
        }
        tabMap[tabObj.id] = tabObj
        roots.push(tabObj)
      })
      chrome.storage.local.set({ tabMap, roots });
    }
  )
}

init()

chrome.tabs.onCreated.addListener(function(tab) {
  var tabObj = {
    id: tab.id, 
    windowId: tab.windowId,
    openerTabId: tab.openerTabId,
    children: []
  }
  tabMap[tabObj.id] = tabObj
  if (!tab.openerTabId) {
    roots.push(tabObj)
  } else {
    // get parent and set as children
    tabMap[tabObj.openerTabId].children.push(tabObj)
  }
  console.log(tabMap)
  console.log(roots)
  chrome.storage.local.set({ roots });
})

chrome.tabs.onRemoved.addListener(function(removedTabId, removeInfo) {
  // tab may not inclueded in our db
  if (!tabMap[removedTabId]) return;
  let removedTab = tabMap[removedTabId];

  let openerTabId = removedTab.openerTabId;
  if (openerTabId) {
    let index = tabMap[openerTabId].children.findIndex((childTab) => childTab.id === removedTab.id)
    tabMap[openerTabId].children.splice(index, 1)
  }

  delete tabMap[removedTabId];

  let indexInRoot = roots.findIndex((rootTab) => rootTab.id === removedTab.id)
  if (indexInRoot !== -1)  {
    roots.splice(indexInRoot, 1)
  }
  console.log(tabMap)
  console.log(roots)
  chrome.storage.local.set({ roots });
})