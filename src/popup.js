// popup.js - 控制擴充功能的開關

const toggleSwitch = document.getElementById('toggleSwitch');
const statusDiv = document.getElementById('status');

// 載入當前狀態
chrome.storage.sync.get(['vsCodeEnabled'], (result) => {
    const isEnabled = result.vsCodeEnabled !== false; // 預設為 true
    toggleSwitch.checked = isEnabled;
    updateStatus(isEnabled);
});

// 監聽開關變化
toggleSwitch.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    
    // 儲存狀態到 Chrome Storage
    chrome.storage.sync.set({ vsCodeEnabled: isEnabled }, () => {
        updateStatus(isEnabled);
        
        // 直接重新載入頁面
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });
});

function updateStatus(enabled) {
    if (enabled) {
        statusDiv.textContent = '✓ VSCode mode enabled';
        statusDiv.classList.add('enabled');
    } else {
        statusDiv.textContent = '✗ Original view';
        statusDiv.classList.remove('enabled');
    }
}
