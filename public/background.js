/* global chrome */

chrome.tabs.onCreated.addListener(tab =>  {
  chrome.storage.local.get(['openerTabIdMap'], result => {
    console.log("new tab ", tab)
    let openerTabIdMap = result.openerTabIdMap || {}
    if(tab.openerTabId) {
      openerTabIdMap[tab.id] = tab.openerTabId
    }
    console.log("openerTabIdMap: ", openerTabIdMap)
    chrome.storage.local.set({ openerTabIdMap });
  })
})

chrome.tabs.onRemoved.addListener((removedTabId, removeInfo) => {
  chrome.storage.local.get(['openerTabIdMap'], result => {
    console.log("remove tab ", removedTabId)
    let openerTabIdMap = result.openerTabIdMap || {}
    let openerTabId = openerTabIdMap[removedTabId]
    Object.keys(openerTabIdMap).forEach(key => {
      if(openerTabIdMap[key] === removedTabId) {
          openerTabIdMap[key] = openerTabId
      }
    });
    delete openerTabIdMap[removedTabId]
    chrome.storage.local.set({ openerTabIdMap });
  })
})