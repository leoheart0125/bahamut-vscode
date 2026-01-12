// content.js

let virtualRoot = null;
let fileTreeHTML = '';
let currentPageType = ''; // 'C' for thread page, 'B' for board list

// Detect page type
function detectPageType() {
    const path = window.location.pathname;
    if (path.includes('/C.php')) return 'C';
    if (path.includes('/B.php')) return 'B';
    return '';
}

// HTML 轉義
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
        
        if (tagName === 'img') {
            if (node.src.includes('emotion')) return `[Emotion]`;
            const src = node.getAttribute('data-src') || node.src;
            return `<span class="com">/* Image: ${escapeHtml(src)} */</span>`;
        } 
        
        if (tagName === 'a') {
            const href = node.href;
            if (href.startsWith('javascript:')) return "";
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

    // --- 修改 1: 在每一樓的起始處加入 ID 定錨點 ---
    // id="floor-anchor-index"
    let code = `\n<span id="floor-anchor-${index}" class="kwd">class</span> <span class="cls">${className}</span> <span class="kwd">extends</span> <span class="cls">Thread</span> {\n`;
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

    // --- 留言處理 ---
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
                    const cText = processNodeContent(textEl).replace(/\n/g, ' ').trim();
                    code += `    <span class="com">//</span> <span class="comment-user">@${cUser}</span><span class="com">: ${cText}</span>\n`;
                }
            });
        }
    }

    // --- 展開按鈕 ---
    const showMoreBtnId = floorId.replace('post_', 'showoldCommend_');
    const realShowMoreBtn = document.getElementById(showMoreBtnId);

    if (realShowMoreBtn && !realShowMoreBtn.classList.contains('is-hide')) {
        code += `\n    <span class="func interactive-code com expand-btn" data-target-id="${showMoreBtnId}">await loadMoreComments(); // [Click to Expand]</span>\n`;
        
        if (!realShowMoreBtn.dataset.observed) {
            realShowMoreBtn.dataset.observed = "true";
            const observer = new MutationObserver(() => {
                if (window.renderTimeout) clearTimeout(window.renderTimeout);
                window.renderTimeout = setTimeout(renderVSCode, 800); 
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
    
    // --- 麵包屑與返回網址 ---
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

    // 返回按鈕
    fileTreeHTML += `<div class="file-item back-btn nav-link" data-href="${boardUrl}"><span class="file-icon">..</span>(Go Back)</div>`;

    const posts = document.querySelectorAll('section.c-section');
    posts.forEach((el, index) => {
        if (el.id.startsWith('div-gpt')) return;
        
        const authorEl = el.querySelector('.username');
        const floorEl = el.querySelector('.floor');
        if (authorEl) {
            const fileName = `floor_${floorEl ? floorEl.dataset.floor : index}.js`;
            // --- 修改 2: 在側邊欄項目加入 data-floor-target 屬性與 file-jump-btn 類別 ---
            fileTreeHTML += `<div class="file-item file-jump-btn" data-floor-target="floor-anchor-${index}"><span class="file-icon">JS</span>${fileName}</div>`;
        }
        fullCodeHTML += generateFloorCode(el, index);
    });

    const lines = fullCodeHTML.split('\n');
    let lineNumbers = '';
    for(let i=1; i<=lines.length; i++) lineNumbers += `<span class="ln">${i}</span>`;

    if (!virtualRoot) {
        virtualRoot = document.createElement('div');
        virtualRoot.id = 'vscode-root';
        
        virtualRoot.innerHTML = `
            <div class="activity-bar">
                <div class="icon active"><svg viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
                <div class="icon"><svg viewBox="0 0 24 24" fill="#858585"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></div>
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
                <div class="code-area" id="v-code-area">
                    <div class="line-numbers" id="v-line-numbers"></div>
                    <div class="code-content" id="v-code-content"></div>
                </div>
                <div class="status-bar">
                    <div style="display:flex;gap:15px;"><span>master*</span><span>0 errors</span></div>
                    <div style="display:flex;gap:15px;"><span>Ln ${lines.length}, Col 1</span><span>UTF-8</span><span>JavaScript</span></div>
                </div>
            </div>
        `;
        document.body.appendChild(virtualRoot);

        // --- Event Delegation ---
        virtualRoot.addEventListener('click', handleVirtualRootClick);
    }

    document.getElementById('v-file-tree').innerHTML = fileTreeHTML;
    document.getElementById('v-line-numbers').innerHTML = lineNumbers;
    document.getElementById('v-code-content').innerHTML = fullCodeHTML;
    document.getElementById('v-breadcrumbs').innerHTML = breadcrumbHTML; 
}

// ==================== Board List Page (B.php) Functions ====================

// Extract thread data from board list
function extractThreadData(threadRow, index) {
    const data = {
        index: index,
        threadId: '',
        title: '',
        url: '',
        subBoard: '',
        gp: 0,
        gpClass: '',
        author: '',
        authorUrl: '',
        replyCount: '',
        viewCount: '',
        lastReplyTime: '',
        lastReplier: '',
        lastReplierUrl: '',
        isSticky: false,
        isNew: false,
        isHighlight: false,
        brief: '',
        pages: []
    };

    // Thread ID
    const idAnchor = threadRow.querySelector('a[name]');
    if (idAnchor) data.threadId = idAnchor.getAttribute('name');

    // Is sticky
    data.isSticky = threadRow.classList.contains('b-list__row--sticky');

    // Sub-board
    const subBoardEl = threadRow.querySelector('.b-list__summary__sort a');
    if (subBoardEl) data.subBoard = subBoardEl.textContent.trim();

    // GP count and class
    const gpEl = threadRow.querySelector('.b-list__summary__gp');
    if (gpEl) {
        data.gp = parseInt(gpEl.textContent.trim()) || 0;
        if (gpEl.classList.contains('b-gp--good')) data.gpClass = 'good';
        else if (gpEl.classList.contains('b-gp--normal')) data.gpClass = 'normal';
    }

    // Main content
    const mainLink = threadRow.querySelector('.b-list__main a');
    if (mainLink) data.url = mainLink.getAttribute('href');

    const titleEl = threadRow.querySelector('.b-list__main__title');
    if (titleEl) {
        data.title = titleEl.textContent.trim();
        data.isHighlight = titleEl.classList.contains('is-highlight');
    }

    // NEW indicator
    data.isNew = !!threadRow.querySelector('.icon-update');

    // Brief
    const briefEl = threadRow.querySelector('.b-list__brief');
    if (briefEl) data.brief = briefEl.textContent.trim();

    // Pages
    const pageEls = threadRow.querySelectorAll('.b-list__main__pages a, .b-list__main__pages span.b-list__page');
    pageEls.forEach(el => {
        data.pages.push(el.textContent.trim());
    });

    // Author
    const authorEl = threadRow.querySelector('.b-list__count__user a');
    if (authorEl) {
        data.author = authorEl.textContent.trim();
        data.authorUrl = authorEl.getAttribute('href');
    }

    // Reply and view counts
    const countSpans = threadRow.querySelectorAll('.b-list__count__number span');
    if (countSpans.length >= 2) {
        data.replyCount = countSpans[0].textContent.trim();
        data.viewCount = countSpans[1].textContent.trim();
    }

    // Last reply info
    const lastTimeEl = threadRow.querySelector('.b-list__time__edittime a');
    if (lastTimeEl) data.lastReplyTime = lastTimeEl.textContent.trim();

    const lastReplierEl = threadRow.querySelector('.b-list__time__user a');
    if (lastReplierEl) {
        data.lastReplier = lastReplierEl.textContent.trim();
        data.lastReplierUrl = lastReplierEl.getAttribute('href');
    }

    return data;
}

// Generate code for single thread
function generateThreadCode(thread) {
    const className = `Thread_${thread.threadId || thread.index}`;
    let code = `\n<span id="thread-anchor-${thread.index}" class="kwd">class</span> <span class="cls">${className}</span> <span class="kwd">extends</span> <span class="cls">ForumThread</span> {\n`;
    code += `    <span class="kwd">constructor</span>() {\n`;
    code += `        <span class="kwd">super</span>();\n`;
    code += `        <span class="kwd">this</span>.<span class="var">title</span> = <span class="str">"${escapeHtml(thread.title)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">author</span> = <span class="str">"${escapeHtml(thread.author)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">subBoard</span> = <span class="str">"${escapeHtml(thread.subBoard)}"</span>;\n`;
    
    // GP with color coding
    let gpColor = thread.gpClass === 'good' ? '#6a9955' : '#dcdcaa';
    code += `        <span class="kwd">this</span>.<span class="var">gp</span> = <span class="num" style="color:${gpColor}">${thread.gp}</span>;\n`;
    
    code += `        <span class="kwd">this</span>.<span class="var">replies</span> = <span class="num">${escapeHtml(thread.replyCount)}</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">views</span> = <span class="str">"${escapeHtml(thread.viewCount)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">lastReply</span> = <span class="str">"${escapeHtml(thread.lastReplyTime)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">lastReplier</span> = <span class="str">"${escapeHtml(thread.lastReplier)}"</span>;\n`;
    code += `        <span class="kwd">this</span>.<span class="var">url</span> = <span class="str">"${escapeHtml(thread.url)}"</span>;\n`;
    
    if (thread.isSticky) {
        code += `        <span class="kwd">this</span>.<span class="var">isSticky</span> = <span class="kwd">true</span>; <span class="com">// 置頂</span>\n`;
    }
    if (thread.isNew) {
        code += `        <span class="kwd">this</span>.<span class="var">isNew</span> = <span class="kwd">true</span>; <span class="com">// NEW</span>\n`;
    }
    if (thread.brief) {
        code += `        <span class="kwd">this</span>.<span class="var">brief</span> = <span class="str">"${escapeHtml(thread.brief.substring(0, 60))}..."</span>;\n`;
    }
    if (thread.pages.length > 0) {
        code += `        <span class="kwd">this</span>.<span class="var">pages</span> = [${thread.pages.map(p => `<span class="num">${p}</span>`).join(', ')}];\n`;
    }
    
    code += `    }\n\n`;
    code += `    <span class="func interactive-code" data-thread-url="${thread.url}">async openThread</span>() {\n`;
    code += `        <span class="com">// Click to open thread</span>\n`;
    code += `        <span class="kwd">window</span>.<span class="var">location</span>.<span class="var">href</span> = <span class="kwd">this</span>.<span class="var">url</span>;\n`;
    code += `    }\n`;
    code += `}\n`;
    
    return code;
}

// Render board list page
function renderBoardList() {
    currentPageType = 'B';
    
    const titleRaw = document.title.split(' - ')[0];
    const title = titleRaw.length > 20 ? titleRaw.substring(0, 20) + '...' : titleRaw;
    
    // Get board info
    const urlParams = new URLSearchParams(window.location.search);
    const bsn = urlParams.get('bsn');
    const subbsn = urlParams.get('subbsn') || '0';
    const boardIndexUrl = `https://forum.gamer.com.tw/`;
    
    // Get pagination info first
    const pageNum = urlParams.get('page') || '1';
    const paginationEl = document.querySelector('.b-pager');
    let totalPages = '?';
    let prevPageUrl = '';
    let nextPageUrl = '';
    
    if (paginationEl) {
        const lastPageLink = paginationEl.querySelector('.BH-pagebtnA a:last-child');
        if (lastPageLink && lastPageLink.textContent.match(/^\d+$/)) {
            totalPages = lastPageLink.textContent;
        }
        
        // Get prev/next page URLs
        const prevBtn = paginationEl.querySelector('a.prev:not(.no)');
        const nextBtn = paginationEl.querySelector('a.next:not(.no)');
        
        if (prevBtn) {
            prevPageUrl = prevBtn.getAttribute('href');
            if (prevPageUrl && !prevPageUrl.startsWith('http')) {
                prevPageUrl = window.location.pathname + prevPageUrl;
            }
        }
        
        if (nextBtn) {
            nextPageUrl = nextBtn.getAttribute('href');
            if (nextPageUrl && !nextPageUrl.startsWith('http')) {
                nextPageUrl = window.location.pathname + nextPageUrl;
            }
        }
    }
    
    // Get current sub-board name
    let subBoardName = '全部主題';
    const activeSubBoard = document.querySelector('.b-tags .b-tags__item a.is-active');
    if (activeSubBoard) {
        subBoardName = activeSubBoard.textContent.trim();
    }
    
    // Breadcrumb with pagination
    let breadcrumbHTML = `src > <span class="nav-link" data-href="${boardIndexUrl}">forums</span> > <span class="nav-link" data-href="?bsn=${bsn}">${title}</span>`;
    if (subbsn !== '0' && activeSubBoard) {
        breadcrumbHTML += ` > ${subBoardName}`;
    }
    
    // Add pagination buttons to breadcrumb
    breadcrumbHTML += `<span style="margin-left: auto; display: flex; gap: 10px; padding-right: 10px;">`;
    if (prevPageUrl) {
        breadcrumbHTML += `<span class="page-nav-btn nav-link" data-href="${prevPageUrl}" title="上一頁 (F7)">◄ Prev</span>`;
    } else {
        breadcrumbHTML += `<span class="page-nav-btn disabled" title="已是第一頁">◄ Prev</span>`;
    }
    breadcrumbHTML += `<span style="color: #007acc; font-weight: bold;">Page ${pageNum}</span>`;
    if (nextPageUrl) {
        breadcrumbHTML += `<span class="page-nav-btn nav-link" data-href="${nextPageUrl}" title="下一頁 (F8)">Next ►</span>`;
    } else {
        breadcrumbHTML += `<span class="page-nav-btn disabled" title="已是最後一頁">Next ►</span>`;
    }
    breadcrumbHTML += `</span>`;

    // Extract all threads
    const threadRows = document.querySelectorAll('tr.b-list__row.b-list-item');
    const stickyThreads = [];
    const regularThreads = [];
    
    threadRows.forEach((row, index) => {
        const data = extractThreadData(row, index);
        if (data.isSticky) {
            stickyThreads.push(data);
        } else {
            regularThreads.push(data);
        }
    });

    // Build file tree
    fileTreeHTML = '';
    fileTreeHTML += `<div class="file-item back-btn nav-link" data-href="${boardIndexUrl}"><span class="file-icon">..</span>(Go Back)</div>`;
    
    if (stickyThreads.length > 0) {
        fileTreeHTML += `<div class="file-separator">━━━━ 置頂文章 ━━━━</div>`;
        stickyThreads.forEach(thread => {
            const fileName = `${thread.title.substring(0, 30)}${thread.title.length > 30 ? '...' : ''}.md`;
            fileTreeHTML += `<div class="file-item thread-link" data-thread-url="${thread.url}" data-thread-target="thread-anchor-${thread.index}">`;
            fileTreeHTML += `<span class="file-icon" style="color:#f48771;">📌</span>${escapeHtml(fileName)}</div>`;
        });
    }
    
    if (regularThreads.length > 0) {
        fileTreeHTML += `<div class="file-separator">━━━━ 一般文章 ━━━━</div>`;
        regularThreads.forEach(thread => {
            const fileName = `${thread.title.substring(0, 30)}${thread.title.length > 30 ? '...' : ''}.md`;
            const icon = thread.isNew ? '🆕' : '📄';
            fileTreeHTML += `<div class="file-item thread-link" data-thread-url="${thread.url}" data-thread-target="thread-anchor-${thread.index}">`;
            fileTreeHTML += `<span class="file-icon">${icon}</span>${escapeHtml(fileName)}</div>`;
        });
    }

    // Build code content
    let fullCodeHTML = '';
    
    // Header comment (use already extracted pagination info)
    fullCodeHTML += `<span class="com">/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>\n`;
    fullCodeHTML += `<span class="com"> * Board: ${escapeHtml(titleRaw)}</span>\n`;
    fullCodeHTML += `<span class="com"> * Sub-board: ${escapeHtml(subBoardName)} (Page ${pageNum}/${totalPages})</span>\n`;
    fullCodeHTML += `<span class="com"> * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */</span>\n\n`;
    
    // Sticky threads section
    if (stickyThreads.length > 0) {
        fullCodeHTML += `<span class="com">// ════════════ 置頂文章 ════════════</span>\n`;
        stickyThreads.forEach(thread => {
            fullCodeHTML += generateThreadCode(thread);
        });
    }
    
    // Regular threads section
    if (regularThreads.length > 0) {
        fullCodeHTML += `\n<span class="com">// ════════════ 一般文章 ════════════</span>\n`;
        regularThreads.forEach(thread => {
            fullCodeHTML += generateThreadCode(thread);
        });
    }

    // Generate line numbers
    const lines = fullCodeHTML.split('\n');
    let lineNumbers = '';
    for(let i=1; i<=lines.length; i++) lineNumbers += `<span class="ln">${i}</span>`;

    // Create or update virtual root
    if (!virtualRoot) {
        virtualRoot = document.createElement('div');
        virtualRoot.id = 'vscode-root';
        
        virtualRoot.innerHTML = `
            <div class="activity-bar">
                <div class="icon active"><svg viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
                <div class="icon"><svg viewBox="0 0 24 24" fill="#858585"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></div>
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
                <div class="code-area" id="v-code-area">
                    <div class="line-numbers" id="v-line-numbers"></div>
                    <div class="code-content" id="v-code-content"></div>
                </div>
                <div class="status-bar" id="v-status-bar">
                    <div style="display:flex;gap:15px;"><span>master*</span><span>0 errors</span></div>
                    <div style="display:flex;gap:15px;align-items:center;">
                        ${prevPageUrl ? `<span class="page-nav-btn nav-link" data-href="${prevPageUrl}" title="上一頁 (F7)" style="cursor:pointer;">◄</span>` : `<span style="opacity:0.3;">◄</span>`}
                        <span>Page ${pageNum}/${totalPages}</span>
                        ${nextPageUrl ? `<span class="page-nav-btn nav-link" data-href="${nextPageUrl}" title="下一頁 (F8)" style="cursor:pointer;">►</span>` : `<span style="opacity:0.3;">►</span>`}
                        <span>|</span>
                        <span>UTF-8</span>
                        <span>JavaScript</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(virtualRoot);

        // Event Delegation
        virtualRoot.addEventListener('click', handleVirtualRootClick);
    }

    document.getElementById('v-file-tree').innerHTML = fileTreeHTML;
    document.getElementById('v-line-numbers').innerHTML = lineNumbers;
    document.getElementById('v-code-content').innerHTML = fullCodeHTML;
    document.getElementById('v-breadcrumbs').innerHTML = breadcrumbHTML;
    
    // Setup keyboard shortcuts for pagination (F7 = prev, F8 = next)
    if (!window.paginationKeyboardSetup) {
        window.paginationKeyboardSetup = true;
        document.addEventListener('keydown', function(e) {
            if (currentPageType === 'B') {
                // F7 = Previous page
                if (e.keyCode === 118 && prevPageUrl) {
                    e.preventDefault();
                    window.location.href = prevPageUrl;
                }
                // F8 = Next page
                if (e.keyCode === 119 && nextPageUrl) {
                    e.preventDefault();
                    window.location.href = nextPageUrl;
                }
            }
        });
    }
}

// Unified event handler for virtual root
function handleVirtualRootClick(e) {
    // 1. Expand comment buttons (C.php only)
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
    
    // 2. Navigation links (breadcrumbs/back button)
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
        const href = navLink.getAttribute('data-href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
            window.location.href = href;
        }
        return;
    }

    // 3. Thread list items (B.php) - navigate to thread
    const threadLink = e.target.closest('.thread-link');
    if (threadLink) {
        const url = threadLink.getAttribute('data-thread-url');
        if (url) {
            window.location.href = url;
        }
        return;
    }

    // 4. File tree jump buttons (C.php) - scroll to floor
    const fileItem = e.target.closest('.file-jump-btn');
    if (fileItem) {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        fileItem.classList.add('active');

        const targetId = fileItem.getAttribute('data-floor-target');
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }

    // 5. Interactive code elements (thread openThread function)
    if (e.target.classList.contains('interactive-code')) {
        const threadUrl = e.target.getAttribute('data-thread-url');
        if (threadUrl) {
            window.location.href = threadUrl;
        }
        return;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

function initializeExtension() {
    currentPageType = detectPageType();
    
    if (currentPageType === 'B') {
        renderBoardList();
    } else if (currentPageType === 'C') {
        renderVSCode();
    }
}

const bodyObserver = new MutationObserver((mutations) => {
    if (window.renderTimeout) clearTimeout(window.renderTimeout);
    window.renderTimeout = setTimeout(() => {
        if (currentPageType === 'B') {
            renderBoardList();
        } else if (currentPageType === 'C') {
            renderVSCode();
        }
    }, 1000);
});
bodyObserver.observe(document.body, { childList: true, subtree: true });
