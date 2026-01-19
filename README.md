# Bahamut VSCode Reader

一個Chrome擴展，將巴哈姆特轉換成VS Code風格的閱讀界面，讓您以程式碼編輯器的視角瀏覽論壇內容。

## 功能特色

- **VS Code 風格界面**：將論壇頁面重新設計為類似Visual Studio Code的編輯器界面，目前支援以下三個頁面轉換。
- **一鍵開關功能**：
  - 點擊瀏覽器工具列的擴充功能圖示
  - 透過彈出視窗切換 VSCode 模式和原始頁面
  - 設定會自動儲存，無需重複設定
- **看板列表頁**：
  - 將所有看板轉換為JavaScript類別格式
  - 顯示看板名稱和BSN編號（不顯示圖片）
  - 顯示前30個熱門看板
  - 點擊可跳轉至對應看板
  - 側邊欄顯示看板清單
- **哈啦板頁面**：
  - 將文章列表轉換為JavaScript類別格式
  - 顯示主題資訊、GP值、回覆數等
  - 支持分頁導航 (F7/F8鍵)
  - 區分置頂文章和一般文章
![image](https://github.com/leoheart0125/bahamut-vscode/blob/main/images/1.png)
- **文章頁面**：
  - 將每個樓層轉換為JavaScript類別格式
  - 顯示作者、內容、評論等資訊
  - 側邊欄顯示樓層導航
  - 支持展開更多評論
![image](https://github.com/leoheart0125/bahamut-vscode/blob/main/images/2.png)
- **導航功能**：
  - 麵包屑導航
  - 側邊欄檔案樹導航
  - 鍵盤快捷鍵支持

## 安裝步驟

1. 從GitHub頁面下載ZIP檔案並解壓縮，或使用 `git clone` 複製此倉庫到本地（注意：尚未設計release流程，請直接下載）
2. 開啟Chrome瀏覽器
3. 在地址欄輸入 `chrome://extensions/`
4. 開啟右上角的「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇 `src` 資料夾（包含 `manifest.json` 的資料夾）

### 鍵盤快捷鍵

在板塊列表頁面：
- `F7`：上一頁
- `F8`：下一頁

## 技術細節

- **manifest_version**: 3
- **適用網站**: forum.gamer.com.tw
- **文件結構**:
  - `src/manifest.json`: 擴展配置
  - `src/content.js`: 主要邏輯腳本
  - `src/vscode_ui.css`: VS Code風格樣式
  - `LICENSE`: MIT許可證

## 許可證

本項目採用MIT許可證 - 詳見 [LICENSE](LICENSE) 文件

## 貢獻

歡迎提交Issue和Pull Request來改進這個項目！

## 作者

leoheart0125
