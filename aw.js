const scriptInjection = `

/* Settings and strings */
const AutoWatch = {

    /* Config Settings */
    RefreshIntervalSeconds : 15,
    RefreshOnlyWhenMinimized : false,
    ShowErrors : true,
    ShowLogs : true,


    /* String List */
    ArrowMinimized : "▶",
    ArrowExpanded : "▼",
    AutoWatchMinimizeKey : "4aw-min",
    CrunchBang : "#!",
    QuickReplyTitle : 'qrTid',
    ThreadWatcherDiv : 'threadWatcher',
    ThreadWatcherHeaderDiv : 'twHeader',
    ThreadWatcherMinimizeDiv : 'twMin',
    ThreadWatcherPruneDiv : 'twPrune',
    WatchListDiv : 'watchList',
};

/* Loggers */
AutoWatch.log = (msg) => {
   if (AutoWatch.ShowLogs) {
       console.log(msg);
   }
};

AutoWatch.error = (msg) => {
    if (AutoWatch.ShowErrors) {
        console.error(msg);
    }
};







/**
 * Master. Registers all reply link clicks to an event handler binding
 * the 'Post' input form that is newly generated on the DOM
 */
function awInit() {
    registerQuickRepliesForPostInputs();
    AutoWatch.log("AW Activated");
}


/**
 * Registers all reply link clicks to an event handler binding
 * the 'Post' input form that is newly generated on the DOM
 */
function registerQuickRepliesForPostInputs() {
    const elementsToRegister = getReplyLinks();
    for (let i = 0; i < elementsToRegister.length; ++i) {
        elementsToRegister[i].removeEventListener('click', registerPostClickHandlers);
        elementsToRegister[i].addEventListener('click', registerPostClickHandlers);
    }
}


/**
 * Registers all 'Post' input forms to a function that adds the current
 * thread into the ThreadWatcher
 */
function registerPostClickHandlers() {
    setTimeout(() => {
        const elementsToRegister = getPostInputs();

        for (let i = 0; i < elementsToRegister.length; ++i) {
            elementsToRegister[i].removeEventListener('click', addThreadToWatchList);
            elementsToRegister[i].addEventListener('click', addThreadToWatchList);
        }
    }, 500);
}


/**
 * Finds and collects all 'Post' input forms on the Dom,
 * even Post inputs that have a cool-down timer to post.
 *
 * @return {Array} - Array of 'Post' input DOM elements
 */
function getPostInputs() {
    const inputElements = document.getElementsByTagName('input');
    const elementsToRegister = [];
    for (let i = 0; i < inputElements.length; ++i) {
        if (inputElements[i].value === "Post") {
            elementsToRegister.push(inputElements[i]);
        }
        /* Register post inputs with wait timers */
        else if ((inputElements[i].value[inputElements[i].value.length-1] === "s") &&
            (!Number.isNaN(parseInt(inputElements[i].value)))) {
            elementsToRegister.push(inputElements[i]);
        }

    }
    return elementsToRegister;
}


/**
 * Finds and collects all 'Reply' links on the Dom, including
 * the top and bottom 'Reply to this Post' link and all post number
 * quote links
 *
 * @return {Array} - Array of 'Reply' link DOM elements
 */
function getReplyLinks() {
    const linkElements = document.getElementsByTagName('a');
    const elementsToRegister = [];
    for (let i = 0; i < linkElements.length; ++i) {
        if (linkElements[i].title === "Reply to this post" || linkElements[i].innerText === "Post a Reply") {
            elementsToRegister.push(linkElements[i]);
        } 
    }
    return elementsToRegister;
}


/**
 * Returns the thread ID of the thread you're posting in. Technically there is
 * existing code that does this in the 4chan extension JS, but I wrote this before
 * I realized Chrome extensions can operate outside of their sandbox by injecting themselves
 * into the DOM
 *
 * @return {string || null} - Returns either the thread ID of the current thread or null on
 * failure
 */
function getCurrentThread() {
    let threadId = null;
    const quickReplyTitle = document.getElementById(AutoWatch.QuickReplyTitle);

    if (quickReplyTitle !== null) {
        AutoWatch.log("Found quick reply title thread");
        threadId = quickReplyTitle.innerHTML;
        return threadId;
    }

    else if (window.location.href.indexOf('thread') !== -1) {
        AutoWatch.log("Using url thread instead of quick reply title");

        const addressSplit = window.location.href.split('/');
        for (let i = 0; i < addressSplit.length; ++i) {
            if (addressSplit[i] === "thread") {
                if (addressSplit[i+1].indexOf("#") !== -1) {
                    threadId = addressSplit[i+1].substr(0, addressSplit[i+1]);
                }
                else {
                    threadId = addressSplit[i+1];
                }
                return threadId;
            }
        }
        AutoWatch.error("Could not get thread ID from url, despite it being there");
    }

    else {
        AutoWatch.error("Could not get thread ID from quick reply title");
        return null;
    }
}


/**
 * Returns the board ID of the board you're posting on. Technically there is
 * existing code that does this in the 4chan extension JS, but I wrote this before
 * I realized Chrome extensions can operate outside of their sandbox by injecting themselves
 * into the DOM
 *
 * @return {string || null} -
 */
function getCurrentBoard() {
    const addressSplit = window.location.href.split('/');
    let board = null;
    for (let i = 0; i < addressSplit.length; ++i) {
        if (addressSplit[i] === "boards.4channel.org" || 
            addressSplit[i] === "boards.4chan.org") {
            board = addressSplit[i+1];
            return board;
        }
    }
    AutoWatch.error("Could not find board from URL");
    return board;
}


/**
 * Master. Gets current thread and board and calls an extended version
 * of an existing function in the ThreadWatcher object supplied by the 4chan
 * extension JS.
 */
function addThreadToWatchList() {
    AutoWatch.log("Adding thread to watch list");
    const threadId = getCurrentThread();
    const  boardId = getCurrentBoard();
    if (threadId !== null && boardId !== null) {
        ThreadWatcher.toggleExt(threadId, boardId);
    }
    else {
        AutoWatch.error("Could not add thread to thread watcher");
    }
    
}


/**
 * Modified version of the ThreadWatcher.toggle function that only
 * adds existing threads to the Thread Watcher without removing them from
 * the list when they have already been added
 *
 * @param e - Thread id
 * @param t - Board id
 */
ThreadWatcher.toggleExt = function(e, t) {
    AutoWatch.log("Activating thread watcher external");
    var a;
    a = e + "-" + (t || Main.board);
    if (this.watched[a]) {
        AutoWatch.log("Thread already watched, exiting");
        return;
    }
    this.add(e, t, a);
    this.save();
    this.load();
    this.build(!0);
};


/**
 * Injects an additional button on the left side of the Thread Watcher header bar
 * that allows you to minimize the Thread Watcher.
 */
function addMinimizeButtonToThreadWatcher() {
    const th = document.getElementById(AutoWatch.ThreadWatcherHeaderDiv);
    const tp = document.getElementById(AutoWatch.ThreadWatcherPruneDiv);
    const wl = document.getElementById(AutoWatch.WatchListDiv);

    if (th === null || tp === null) {
        AutoWatch.error("Could not find thread watcher or thread prune button");
        return;
    }
    const tm = '<a href="#!" style="float: left;" id="twMin" title="Post menu" >▼</a>' 
        + th.innerHTML;
    th.innerHTML = tm;
    const tmInjected = document.getElementById(AutoWatch.ThreadWatcherMinimizeDiv);

    if (localStorage.getItem(AutoWatch.AutoWatchMinimizeKey) === "false") {
        wl.style.display = "block";
        tmInjected.innerHTML = AutoWatch.ArrowExpanded;
    }
    else if (localStorage.getItem(AutoWatch.AutoWatchMinimizeKey) === "true") {
        wl.style.display = "none";
        tmInjected.innerHTML = AutoWatch.ArrowMinimized;
    }
    addEventListenerToMinimizeButton(tmInjected);
}


/**
 * Binds the newly injected minimize button on the Thread Watcher header
 * to some code that minimizes the watch list.
 *
 * @param minButton - DOM element for the minimize button.
 */
function addEventListenerToMinimizeButton(minButton) {

    const tw = document.getElementById(AutoWatch.ThreadWatcherDiv);
    const wl = document.getElementById(AutoWatch.WatchListDiv);
    
    if (minButton !== null) {
        minButton .addEventListener('click', () => {
            if (wl !== null && wl.style.display === "none") {
                wl.style.display = "block";
                minButton.innerHTML = AutoWatch.ArrowExpanded;
                localStorage.setItem(AutoWatch.AutoWatchMinimizeKey, "false");
            }
            else {
                const wlw = getComputedStyle(tw).width;
                wl.style.display = "none";
                tw.style.width = wlw;
                minButton.innerHTML = AutoWatch.ArrowMinimized;
                localStorage.setItem(AutoWatch.AutoWatchMinimizeKey, "true");
            }
        });
    }
    
}


/**
 * Adds a JS interval that refreshes the Thread Watcher at the specified
 * rate listed in the AutoWatch config variables. Also calls a function to update
 * the appearance of the Thread Watcher header if the Thread Watcher is minimized.
 */
function refreshMinimizedThreadWatcher() {
    setInterval(() => {

        if (threadWatcherIsRefreshing()) {
            return;
        }

        setTimeout(() => {
            const isMin = isThreadWatcherMinimized();

            if (!AutoWatch.RefreshOnlyWhenMinimized) {
                ThreadWatcher.refresh();
            }

            if (isMin) {
                if (AutoWatch.RefreshOnlyWhenMinimized) {
                    ThreadWatcher.refresh();
                }
                const waitForRefreshFinish = setInterval(() => {
                    if (!threadWatcherIsRefreshing()) {
                        updateMinimizedThreadWatcher();
                        clearInterval(waitForRefreshFinish);
                    }
                }, 500);
            }

        }, 150);


    }, AutoWatch.RefreshIntervalSeconds*1000);
}


/**
 * Helper to check whether the Thread Watcher is currently minimized.
 */
function isThreadWatcherMinimized () {
    const tm = document.getElementById(AutoWatch.ThreadWatcherMinimizeDiv);

    if (localStorage.getItem(AutoWatch.AutoWatchMinimizeKey) === "true"
        || tm.innerHTML === AutoWatch.ArrowMinimized) {
        return true;
    }
    return false;
}


/**
 * Helper to check whether the Thread Watcher is in the middle of a refresh operation
 */
function threadWatcherIsRefreshing() {

    const tp = document.getElementById(AutoWatch.ThreadWatcherPruneDiv);
    if (tp.attributes['src'] !== undefined) {
        const pruneImgSrcSplit = tp.attributes['src'].value.split('/');

        for (let i = 0; i < pruneImgSrcSplit.length; ++i) {
            if (pruneImgSrcSplit[i] === "refresh.png") {
                return false;
            }
            else if (pruneImgSrcSplit[i] === "post_expand_rotate.gif") {
                return true;
            }
        }
    }

    for (let i = 0; i < tp.classList.length; ++i) {
        if (tp.classList[i] === "refreshIcon") {
            return false;
        }
        else if (tp.classList[i] === "rotateIcon") {
            return true;
        }
    }
    return false;
}


/**
 * Updates the Thread Watcher header appearance when the Thread Watcher is minimized. If new replies
 * are detected, the Thread Watcher header becomes italicized. If new (You) replies are detected
 * a "!" is appended to the Thread Watcher header.
 */
function updateMinimizedThreadWatcher() {

    const wl = document.getElementById(AutoWatch.WatchListDiv);
    const th = document.getElementById(AutoWatch.ThreadWatcherHeaderDiv);
    let tm = document.getElementById(AutoWatch.ThreadWatcherMinimizeDiv);

    while (th.innerHTML.indexOf("!") !== -1) {
        th.innerHTML = th.innerHTML.replace("!", "");
    }

    for (let i = 0; i < wl.children.length; ++i) {
        for (let j = 0; j < wl.children[i].children.length; ++j) {
            for (let k = 0; k < wl.children[i].children[j].classList.length; ++k) {
                const classItem = wl.children[i].children[j].classList[k];
                if (classItem === "hasNewReplies") {
                    th.classList.add("hasYouReplies");
                }
                if (classItem === "hasYouReplies") {
                    th.innerHTML = th.innerHTML + "!";
                }
            }

        }
    }
    addEventListenerToMinimizeButton(tm = document.getElementById(AutoWatch.ThreadWatcherMinimizeDiv));
    tm.attributes['href'].value = AutoWatch.CrunchBang;

}


awInit();
addMinimizeButtonToThreadWatcher();
refreshMinimizedThreadWatcher();
`;

/* Out of the sandbox */
const script = document.createElement('script');
script.textContent = scriptInjection;
(document.documentElement).appendChild(script);
