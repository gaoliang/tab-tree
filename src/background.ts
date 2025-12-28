chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => {
  chrome.storage.local.get(['openerTabIdMap'], result => {
    console.log("new tab ", tab)
    const openerTabIdMap = result.openerTabIdMap || {}
    if(tab.pendingUrl !== "chrome://newtab/" && tab.openerTabId) {
      openerTabIdMap[tab.id as number] = tab.openerTabId
    }
    console.log("openerTabIdMap: ", openerTabIdMap)
    chrome.storage.local.set({ openerTabIdMap });
  })
})

chrome.tabs.onRemoved.addListener((removedTabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
  chrome.storage.local.get(['openerTabIdMap'], result => {
    console.log("remove tab ", removedTabId)
    const openerTabIdMap = result.openerTabIdMap || {}
    const openerTabId = openerTabIdMap[removedTabId]
    Object.keys(openerTabIdMap).forEach(key => {
      // key is string, need to convert to number for comparison if keys are stored as numbers
      // But object keys are always strings in JS.
      // If openerTabIdMap values are tabIds (numbers).
      if(openerTabIdMap[key] === removedTabId) {
          if (openerTabId) {
            openerTabIdMap[key] = openerTabId
          } else {
            delete openerTabIdMap[key]
          }
      }
    });
    delete openerTabIdMap[removedTabId]
    chrome.storage.local.set({ openerTabIdMap });
  })
})