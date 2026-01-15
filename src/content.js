// content.js

let virtualRoot = null;
let fileTreeHTML = '';
let currentPageType = ''; 

function detectPageType() {
    const path = window.location.pathname;
    if (path.includes('/C.php')) return 'C';
    if (path.includes('/B.php')) return 'B';
    return '';
}

const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// 處理內文與節點
function processNodeContent(node) {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent);
    
    if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('google-auto-placed') || node.style.display === 'none') return "";

        const tagName = node.tagName.toLowerCase();
        if (tagName === 'br') return '\n';
        
        // --- 圖片處理 (修正重點) ---
        if (tagName === 'img') {
            const src = node.getAttribute('data-src') || node.src;
            
            // 判斷是否為表情符號 (直接顯示)
            const isEmotion = src.includes('editor/emotion') || 
                              src.includes('/sticker/') || 
                              node.className.includes('sticker');

            if (isEmotion) {
                 return `<img src="${src}" class="vscode-emotion" style="vertical-align:middle;">`;
            }
            
            // 一般圖片 (折疊)
            return `<span class="image-container"><span class="img-placeholder">/* [Image] Click to load */</span><img data-src-real="${src}" class="vscode-content-image"></span>`;
        } 
        
        if (tagName === 'a') {
            const href = node.href;
            if (href.startsWith('javascript:')) return "";
            
            // 連結內包圖片 -> 遞迴處理 (讓裡面的圖片也能被判斷是否為表情)
            const innerImg = node.querySelector('img');
            if (innerImg) {
                return processNodeContent(innerImg);
            }

            const text = node.textContent || href;
            return `<a href="${href}" target="_blank" class="token-link">"${escapeHtml(text)}"</a>`;
        }
        
        let childResult = "";
        node.childNodes.forEach(child => childResult += processNodeContent(child));
        return (tagName === 'div' || tagName === 'p') ? childResult + "\n" : childResult;
    }
    return "";
}

// 產生單一樓層代碼
function generateFloorCode(floorEl, index) {
    const authorEl = floorEl.querySelector('.username');
    const contentEl = floorEl.querySelector('.c-article__content');
    const floorNumEl = floorEl.querySelector('.floor');
    const floorId = floorEl.id; 

    if (!authorEl || !contentEl) return "";

    const author = authorEl.textContent.trim();
    const floorNum = floorNumEl ? floorNumEl.dataset.floor : index;
    const className = `Floor${floorNum}_${author.replace(/\s+/g, '_')}`;

    let code = `\n<div id="floor-anchor-${index}"><span class="kwd">class</span> <span class="cls">${className}</span> <span class="kwd">extends</span> <span class="cls">Thread</span> {</div>\n`;
    code += `    <span class="kwd">constructor</span>() {\n`;
    code += `        <span class="kwd">super</span>();\n`;
    code += `        <span class="kwd">this</span>.<span class="var">author</span> = <span class="str">"${author}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">content</span> = \`\n`;

    let processedContent = processNodeContent(contentEl);
    processedContent.split('\n').forEach(line => {
        if (line.trim() !== '') code += `        ${line}\n`;
    });

    code += `        \`;\n`;
    code += `    }\n`;

    // 留言處理
    const commentListId = floorId.replace('post_', 'Commendlist_');
    const commentListEl = document.getElementById(commentListId);
    
    if (commentListEl) {
        const comments = commentListEl.querySelectorAll('.c-reply__item');
        if (comments.length > 0) {
            code += `\n    <span class="com">/* --- Comments (${comments.length}) --- */</span>\n`;
            
            comments.forEach(c => {
                const userEl = c.querySelector('.reply-content__user');
                const textEl = c.querySelector('.comment_content') || c.querySelector('.reply-content__article'); 
                
                if (userEl && textEl) {
                    const cUser = userEl.textContent.trim();
                    // 留言內容也要經過 processNodeContent 處理，這樣留言裡的表情符號才會正常顯示
                    const cText = processNodeContent(textEl).replace(/\n/g, ' ').trim();
                    code += `    <span class="com">//</span> <span class="comment-user">@${cUser}</span><span class="com">: ${cText}</span>\n`;
                }
            });
        }
    }

    const showMoreBtnId = floorId.replace('post_', 'showoldCommend_');
    const realShowMoreBtn = document.getElementById(showMoreBtnId);

    if (realShowMoreBtn && !realShowMoreBtn.classList.contains('is-hide')) {
        code += `\n    <span class="func interactive-code com expand-btn" data-target-id="${showMoreBtnId}">await loadMoreComments(); // [Click to Expand]</span>\n`;
        
        if (!realShowMoreBtn.dataset.observed) {
            realShowMoreBtn.dataset.observed = "true";
            const observer = new MutationObserver(() => {
                if (window.renderTimeout) clearTimeout(window.renderTimeout);
                window.renderTimeout = setTimeout(() => {
                    if (currentPageType === 'C') renderVSCode();
                }, 800); 
            });
            if (commentListEl) observer.observe(commentListEl, { childList: true, subtree: true });
        }
    }

    code += `}\n`;
    return code;
}

function renderVSCode() {
    const titleRaw = document.title.split(' - ')[0];
    const title = titleRaw.length > 20 ? titleRaw.substring(0, 20) + '...' : titleRaw;
    
    const urlParams = new URLSearchParams(window.location.search);
    const bsn = urlParams.get('bsn'); 
    const boardUrl = `https://forum.gamer.com.tw/B.php?bsn=${bsn}`;
    
    const breadcrumbLinks = document.querySelectorAll('#BH-menu-path a');
    let boardName = "Board Index";
    if (breadcrumbLinks.length > 0) {
        boardName = breadcrumbLinks[breadcrumbLinks.length - 1].textContent;
    }

    let breadcrumbHTML = `src > forums > <span class="nav-link" data-href="${boardUrl}">${boardName}</span>`;

    let fullCodeHTML = '';
    fileTreeHTML = ''; 

    fileTreeHTML += `<div class="file-item back-btn nav-link" data-href="${boardUrl}"><span class="file-icon">..</span>(Go Back)</div>`;

    const posts = document.querySelectorAll('section.c-section');
    posts.forEach((el, index) => {
        if (el.id.startsWith('div-gpt')) return;
        
        const authorEl = el.querySelector('.username');
        const floorEl = el.querySelector('.floor');
        if (authorEl) {
            const fileName = `floor_${floorEl ? floorEl.dataset.floor : index}.js`;
            fileTreeHTML += `<div class="file-item file-jump-btn" data-floor-target="floor-anchor-${index}"><span class="file-icon">JS</span>${fileName}</div>`;
        }
        fullCodeHTML += generateFloorCode(el, index);
    });

    const rawLines = fullCodeHTML.split('\n');
    let renderLinesHTML = '';
    let lineNum = 1;

    rawLines.forEach(lineContent => {
        if (lineContent === '') lineContent = '&nbsp;';
        renderLinesHTML += `
            <div class="code-row">
                <div class="ln-cell">${lineNum}</div>
                <div class="content-cell">${lineContent}</div>
            </div>
        `;
        lineNum++;
    });

    createVirtualRoot(title, breadcrumbHTML, renderLinesHTML, lineNum, fileTreeHTML);
    
    document.getElementById('v-file-tree').innerHTML = fileTreeHTML;
    document.getElementById('v-breadcrumbs').innerHTML = breadcrumbHTML;
    document.getElementById('v-code-area').innerHTML = renderLinesHTML;
}

// ==================== B.php Logic (縮減版，邏輯不變) ====================
function extractThreadData(threadRow, index) { 
    // ... (維持之前的 B.php 邏輯) ...
    const data = { index: index, threadId: '', title: '', url: '', subBoard: '', gp: 0, gpClass: '', author: '', replyCount: '', viewCount: '', lastReplyTime: '', lastReplier: '', isSticky: false, isNew: false, brief: '', pages: [] };
    const idAnchor = threadRow.querySelector('a[name]'); if (idAnchor) data.threadId = idAnchor.getAttribute('name');
    data.isSticky = threadRow.classList.contains('b-list__row--sticky');
    const subBoardEl = threadRow.querySelector('.b-list__summary__sort a'); if (subBoardEl) data.subBoard = subBoardEl.textContent.trim();
    const gpEl = threadRow.querySelector('.b-list__summary__gp'); if (gpEl) { data.gp = parseInt(gpEl.textContent.trim()) || 0; if (gpEl.classList.contains('b-gp--good')) data.gpClass = 'good'; else if (gpEl.classList.contains('b-gp--normal')) data.gpClass = 'normal'; }
    const mainLink = threadRow.querySelector('.b-list__main a'); if (mainLink) data.url = mainLink.getAttribute('href');
    const titleEl = threadRow.querySelector('.b-list__main__title'); if (titleEl) data.title = titleEl.textContent.trim();
    data.isNew = !!threadRow.querySelector('.icon-update');
    const briefEl = threadRow.querySelector('.b-list__brief'); if (briefEl) data.brief = briefEl.textContent.trim();
    const pageEls = threadRow.querySelectorAll('.b-list__main__pages a, .b-list__main__pages span.b-list__page'); pageEls.forEach(el => data.pages.push(el.textContent.trim()));
    const authorEl = threadRow.querySelector('.b-list__count__user a'); if (authorEl) data.author = authorEl.textContent.trim();
    const countSpans = threadRow.querySelectorAll('.b-list__count__number span'); if (countSpans.length >= 2) { data.replyCount = countSpans[0].textContent.trim(); data.viewCount = countSpans[1].textContent.trim(); }
    const lastTimeEl = threadRow.querySelector('.b-list__time__edittime a'); if (lastTimeEl) data.lastReplyTime = lastTimeEl.textContent.trim();
    const lastReplierEl = threadRow.querySelector('.b-list__time__user a'); if (lastReplierEl) data.lastReplier = lastReplierEl.textContent.trim();
    return data;
}

function generateThreadCode(thread) { /* ... (維持之前的 B.php 邏輯) ... */
    const className = `Thread_${thread.threadId || thread.index}`;
    let code = `\n<div id="thread-anchor-${thread.index}"><span class="kwd">class</span> <span class="cls">${className}</span> <span class="kwd">extends</span> <span class="cls">ForumThread</span> {</div>\n`;
    code += `    <span class="kwd">constructor</span>() {\n`;
    code += `        <span class="kwd">super</span>();\n`;
    code += `        <span class="kwd">this</span>.<span class="var">title</span> = <span class="str">"${escapeHtml(thread.title)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">author</span> = <span class="str">"${escapeHtml(thread.author)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">subBoard</span> = <span class="str">"${escapeHtml(thread.subBoard)}"</span>;\n`;
    let gpColor = thread.gpClass === 'good' ? '#6a9955' : '#dcdcaa';
    code += `        <span class="kwd">this</span>.<span class="var">gp</span> = <span class="num" style="color:${gpColor}">${thread.gp}</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">replies</span> = <span class="num">${escapeHtml(thread.replyCount)}</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">views</span> = <span class="str">"${escapeHtml(thread.viewCount)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">url</span> = <span class="str">"${escapeHtml(thread.url)}"</span>;\n`;
    code += `    }\n\n`;
    code += `    <span class="func interactive-code" data-thread-url="${thread.url}">async openThread</span>() {\n`;
    code += `        <span class="com">// Click to open thread</span>\n`;
    code += `        <span class="kwd">window</span>.<span class="var">location</span>.<span class="var">href</span> = <span class="kwd">this</span>.<span class="var">url</span>;\n`;
    code += `    }\n`;
    code += `}\n`;
    return code;
}

function renderBoardList() { /* ... (維持之前的 B.php 邏輯) ... */
    currentPageType = 'B';
    const titleRaw = document.title.split(' - ')[0];
    const title = titleRaw.length > 20 ? titleRaw.substring(0, 20) + '...' : titleRaw;
    const urlParams = new URLSearchParams(window.location.search);
    const bsn = urlParams.get('bsn');
    const subbsn = urlParams.get('subbsn') || '0';
    const boardIndexUrl = `https://forum.gamer.com.tw/`;
    const pageNum = urlParams.get('page') || '1';
    
    // Pagination (simplified for display)
    const paginationEl = document.querySelector('.b-pager');
    let prevPageUrl = '', nextPageUrl = '';
    if (paginationEl) {
        const prevBtn = paginationEl.querySelector('a.prev:not(.no)');
        const nextBtn = paginationEl.querySelector('a.next:not(.no)');
        if (prevBtn) { prevPageUrl = prevBtn.getAttribute('href'); if (!prevPageUrl.startsWith('http')) prevPageUrl = window.location.pathname + prevPageUrl; }
        if (nextBtn) { nextPageUrl = nextBtn.getAttribute('href'); if (!nextPageUrl.startsWith('http')) nextPageUrl = window.location.pathname + nextPageUrl; }
    }
    
    let breadcrumbHTML = `src > <span class="nav-link" data-href="${boardIndexUrl}">forums</span> > <span class="nav-link" data-href="?bsn=${bsn}">${title}</span>`;
    
    // Pagination UI
    breadcrumbHTML += `<span style="margin-left: auto; display: flex; gap: 10px; padding-right: 10px;">`;
    if (prevPageUrl) breadcrumbHTML += `<span class="page-nav-btn nav-link" data-href="${prevPageUrl}">◄ Prev</span>`;
    breadcrumbHTML += `<span style="color: #007acc; font-weight: bold;">Page ${pageNum}</span>`;
    if (nextPageUrl) breadcrumbHTML += `<span class="page-nav-btn nav-link" data-href="${nextPageUrl}">Next ►</span>`;
    breadcrumbHTML += `</span>`;

    const threadRows = document.querySelectorAll('tr.b-list__row.b-list-item');
    fileTreeHTML = `<div class="file-item back-btn nav-link" data-href="${boardIndexUrl}"><span class="file-icon">..</span>(Go Back)</div>`;
    
    let fullCodeHTML = `<span class="com">/* Board: ${escapeHtml(titleRaw)} (Page ${pageNum}) */</span>\n\n`;
    
    const rawLines = [];
    threadRows.forEach((row, index) => {
        const data = extractThreadData(row, index);
        const fileName = `${data.title.substring(0, 20)}.md`;
        const icon = data.isSticky ? '📌' : (data.isNew ? '🆕' : '📄');
        
        fileTreeHTML += `<div class="file-item file-jump-btn" data-floor-target="thread-anchor-${index}"><span class="file-icon">${icon}</span>${escapeHtml(fileName)}</div>`;
        fullCodeHTML += generateThreadCode(data);
    });

    fullCodeHTML.split('\n').forEach(line => {
        rawLines.push(line === '' ? '&nbsp;' : line);
    });

    let renderLinesHTML = '';
    let lineNum = 1;
    rawLines.forEach(lineContent => {
        renderLinesHTML += `<div class="code-row"><div class="ln-cell">${lineNum}</div><div class="content-cell">${lineContent}</div></div>`;
        lineNum++;
    });

    createVirtualRoot(title, breadcrumbHTML, renderLinesHTML, lineNum, fileTreeHTML);
    document.getElementById('v-file-tree').innerHTML = fileTreeHTML;
    document.getElementById('v-breadcrumbs').innerHTML = breadcrumbHTML;
    document.getElementById('v-code-area').innerHTML = renderLinesHTML;
}

// ==================== Common Infrastructure ====================

function createVirtualRoot(title, breadcrumbHTML, renderLinesHTML, lineCount, fileTreeHTML) {
    if (!virtualRoot) {
        virtualRoot = document.createElement('div');
        virtualRoot.id = 'vscode-root';
        
        virtualRoot.innerHTML = `
            <div class="activity-bar">
                <div class="icon active"><svg viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
            </div>
            <div class="sidebar">
                <div class="sidebar-title"><span>EXPLORER</span><span>...</span></div>
                <div class="sidebar-title" style="margin-top:0;">▼ ${title}</div>
                <div class="file-tree" id="v-file-tree"></div>
            </div>
            <div class="main-editor">
                <div class="tabs-bar">
                    <div class="tab active"><span style="color:#e8b058;margin-right:5px;">JS</span>${title}.js</div>
                </div>
                <div class="breadcrumbs" id="v-breadcrumbs">${breadcrumbHTML}</div>
                <div class="code-area" id="v-code-area"></div>
                <div class="status-bar" id="v-status-bar">
                    <div style="display:flex;gap:15px;"><span>master*</span><span>0 errors</span></div>
                    <div style="display:flex;gap:15px;align-items:center;">
                        <span>Ln ${lineCount}, Col 1</span>
                        <span>|</span>
                        <span>UTF-8</span>
                        <span>JavaScript</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(virtualRoot);
        virtualRoot.addEventListener('click', handleVirtualRootClick);
    }
}

function handleVirtualRootClick(e) {
    // 1. Expand comment buttons (C.php)
    if (e.target.classList.contains('expand-btn')) {
        const targetId = e.target.getAttribute('data-target-id');
        const realBtn = document.getElementById(targetId);
        if (realBtn) {
            e.target.innerText = "loading... // Please wait";
            e.target.style.cursor = "wait";
            realBtn.click();
        }
        return;
    }
    
    // 2. Navigation links
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
        const href = navLink.getAttribute('data-href');
        if (href && href !== '#' && !href.startsWith('javascript:')) window.location.href = href;
        return;
    }

    // 3. Thread / Sidebar Jump
    const fileItem = e.target.closest('.file-jump-btn');
    if (fileItem) {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        fileItem.classList.add('active');
        const targetId = fileItem.getAttribute('data-floor-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // 4. Interactive Code (B.php openThread)
    if (e.target.classList.contains('interactive-code')) {
        const threadUrl = e.target.getAttribute('data-thread-url');
        if (threadUrl) window.location.href = threadUrl;
        return;
    }

    // 5. Image Toggle (New: Click Placeholder -> Load & Show)
    if (e.target.classList.contains('img-placeholder')) {
        const container = e.target.closest('.image-container');
        if (!container) return; // safety check

        const img = container.querySelector('.vscode-content-image');
        if (img) {
            if (!img.getAttribute('src')) {
                img.src = img.getAttribute('data-src-real');
            }
            e.target.style.display = 'none';
            img.style.display = 'block';
        }
        return;
    }

    // 6. Image Toggle (New: Click Image -> Hide)
    if (e.target.classList.contains('vscode-content-image')) {
        const container = e.target.closest('.image-container');
        if (!container) return; // safety check

        const placeholder = container.querySelector('.img-placeholder');
        if (placeholder) {
            e.target.style.display = 'none';
            placeholder.style.display = 'inline';
        }
        return;
    }
}

// 監聽 DOM 變動 (防止無限重繪)
const bodyObserver = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const mutation of mutations) {
        if (mutation.target.closest && mutation.target.closest('#vscode-root')) continue;
        if (mutation.target.tagName === 'SCRIPT' || mutation.target.tagName === 'IFRAME') continue;
        shouldRender = true;
        break;
    }

    if (shouldRender) {
        if (window.renderTimeout) clearTimeout(window.renderTimeout);
        window.renderTimeout = setTimeout(() => {
            if (currentPageType === 'B') renderBoardList();
            else if (currentPageType === 'C') renderVSCode();
        }, 1000);
    }
});

// 初始化
function initializeExtension() {
    currentPageType = detectPageType();
    if (currentPageType === 'B') renderBoardList();
    else if (currentPageType === 'C') renderVSCode();
    
    // 設定觀察器
    bodyObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: false 
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}