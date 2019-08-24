let closeCollection: HTMLCollectionOf<HTMLElement> = document.getElementsByClassName("close") as HTMLCollectionOf<HTMLElement>;

let newPostClose: HTMLElement = closeCollection[0]
let feedClose: HTMLElement = closeCollection[1]
let yourPostsClose: HTMLElement = closeCollection[2]
let friendsClose: HTMLElement = closeCollection[3]
let friendsPostsClose: HTMLElement = closeCollection[4]

let newPostPopup = document.getElementById('newPostPopup');
let feedPopup = document.getElementById('feedPopup');
let yourPostsPopup = document.getElementById('yourPostsPopup');
let friendsPopup = document.getElementById('friendsPopup');
let friendPostsPopup = document.getElementById('friendPostsPopup');
let postListFeed = document.getElementById('postListFeed');
let postListFriend = document.getElementById('postListFriend');

let newPost = document.getElementById('newPost');
let feed = document.getElementById('feed');
let yourPosts = document.getElementById('yourPosts');
let friends = document.getElementById('friends');

let loadOlder = document.getElementById('loadOlder');
let refresh = document.getElementById('refresh');

let loadOlderFriend = document.getElementById('loadOlderFriend');
let refreshFriend = document.getElementById('refreshFriend');

// Usernames
let observedName = document.getElementById('observedName') as HTMLInputElement;
let usernameVal = document.getElementById('usernameVal') as HTMLInputElement;

// Lists
let postList = document.getElementById('postList');
let observedList = document.getElementById('observedList');


// Adding closing and opening popups

//Closes
newPostClose.onclick = function () {
    newPostPopup.style.display = "none";
}

feedClose.onclick = function () {
    feedPopup.style.display = "none";
    postListFeed.innerHTML = ""
    doFetch('/resetDatesOnYourPosts')
}

yourPostsClose.onclick = function () {
    yourPostsPopup.style.display = "none";
    postList.innerHTML = ""
    doFetch('/resetDatesOnYourPosts')
}

friendsClose.onclick = function () {
    friendsPopup.style.display = "none";
    doFetch('/resetDatesOnYourPosts')
}

friendsPostsClose.onclick = function () {
    friendPostsPopup.style.display = "none";
    postListFriend.innerHTML = ""
    doFetch('/resetDatesOnYourPosts')
}

window.onclick = function (event) {
    if (event.target == friendPostsPopup) {
        friendPostsPopup.style.display = "none";
    } else if (event.target == newPostPopup || event.target == feedPopup || event.target == yourPostsPopup || event.target == friendsPopup) {
        newPostPopup.style.display = "none";
        feedPopup.style.display = "none";
        yourPostsPopup.style.display = "none";
        friendsPopup.style.display = "none";
        postList.innerHTML = ""
        postListFeed.innerHTML = ""
        postListFriend.innerHTML = ""
        doFetch('/resetDatesOnYourPosts')
    }
}

//Opens
newPost.onclick = function () {
    newPostPopup.style.display = "block";
}

feed.onclick = function () {
    feedPopup.style.display = "block";
}

friends.onclick = async function () {
    friendsPopup.style.display = "block";
    let users = await doFetch('/myObserved')

    if (!users)
        return

    buildFriendsList(users)
}

// Handle user posts

yourPosts.onclick = async function () {
    yourPostsPopup.style.display = "block";
    let response = await doFetch('/posts/getMorePosts/' + usernameVal.value)

    if (!response)
        return

    buildUserPosts(response, true, null, postList)
}

loadOlder.onclick = async function () {
    let response = await doFetch('/posts/getMorePosts/' + usernameVal.value)

    if (!response)
        return

    buildUserPosts(response, true, null, postList)
}

refresh.onclick = async function () {
    let response = await doFetch('/posts/refresh/' + usernameVal.value)
    
    if (!response)
        return
    
    buildUserPosts(response, false, null, postList)
}

// Handle friends posts

loadOlderFriend.onclick = async function () {
    let response = await doFetch('/posts/getMorePosts/' + observedName.value)

    if (!response)
        return

    buildUserPosts(response, true, observedName.value, postListFriend)
}

refreshFriend.onclick = async function() {
    let response = await doFetch('/posts/refresh/' + observedName.value)

    if (!response)
        return

    buildUserPosts(response, false, observedName.value, postListFriend)
}

// Send new Post
let newPostTitle = document.getElementById('newPostTitle') as HTMLInputElement;
let newPostContent = document.getElementById('newPostContent') as HTMLInputElement;

function newPostValidate() {
    console.log("newPostTitle.value:" + newPostTitle.value + "|newPostContent.value:" + newPostContent.value)

    if (!newPostTitle.value || !newPostContent.value || newPostTitle.value.length === 0 || newPostContent.value.length === 0) {
        asyncAlert("Post needs a non empty title and content")
        return false;
    } else {
        if (newPostTitle.value.length >= 30) {
            asyncAlert("Post title too long, can be max 30 characters")
            return false;
        }
        if (newPostContent.value.length >= 200) {
            asyncAlert("Post too long, can be max 200 characters")
            return false;
        }
        if (newPostContent.value.includes(';') || newPostContent.value.includes('|')) {
            asyncAlert("Post contains invalid character ('|' or ';')")
            return false;
        }
        if (newPostTitle.value.includes(';') || newPostTitle.value.includes('|')) {
            asyncAlert("Post title contains invalid character ('|' or ';')")
            return false;
        }

        return true;
    }
}

async function asyncAlert(message) {
    alert(message)
}

// Fetching stuff

async function doFetch(fetchRequest: string) {
    let response
    try {
        let res = await fetch(fetchRequest);
        response = await res.json();
    } catch (err) {
        return null
    }
    return response
}

// Functions build a list of posts if append is set to true,
// posts will be ppended at the end of the list, otherwise they
// will be prepended
function buildUserPosts(response, append: boolean, username: string, list): void {
    for (let idx in response) {
        let idxActual

        if (append) {
            idxActual = parseInt(idx)
        } else {
            idxActual = response.length - parseInt(idx) - 1
        }

        let node = document.createElement("LI");

        if (username) {
            let usernameElem = document.createElement("h3");
            usernameElem.classList.add('TitleAndName');
            usernameElem.classList.add('postsHeaders');
            usernameElem.innerHTML = username + ":"
            node.appendChild(usernameElem);
        }

        let title = document.createElement("h3");
        let date = document.createElement("h3");
        let contents = document.createElement("p");
        title.classList.add('postsHeaders');
        title.classList.add('TitleAndName');
        date.classList.add('postsHeaders');
        date.classList.add('date');
        contents.classList.add('contents');
        contents.innerHTML = response[idxActual]['contents']
        title.innerHTML = response[idxActual]['title']
        let dateStr = new Date(response[idxActual]['date']).toString()
        let dateArr = dateStr.split(' ')
        dateArr = dateArr.slice(0, 5)
        date.innerHTML = dateArr.join(' ')

        node.appendChild(title);
        node.appendChild(date);
        node.appendChild(contents);

        if (append) {
            list.appendChild(node);
        } else {
            list.prepend(node);
        }
    }
}

function buildFriendsList(friends): void {
    observedList.innerHTML = ""

    for (let friendIdxStr in friends) {
        let friendIdx = parseInt(friendIdxStr)
        let friendName = friends[friendIdx]["observed"]
        console.log(friendName)

        let node = document.createElement("LI");
        let contents = document.createElement("p");
        contents.classList.add('users');
        contents.onclick = function () { showFriend(friendName); }
        contents.innerHTML = friendName
        node.appendChild(contents)
        observedList.appendChild(node)
    }
}

function newObservedValidate() {
    let newObservedName = document.getElementById('newObservedName') as HTMLInputElement
    let username = newObservedName.value

    if (!username) {
        return false
    }

    if (username.match("^[A-z0-9*!]+$") && username.length <= 30 && username.length >= 4 && username !== usernameVal.value) {
        return true
    } else {
        asyncAlert("Entered username was invalid")
        return false
    }
}

async function showFriend(friendName: string) {
    let FriendFeedHeader = document.getElementById('FriendFeedHeader');

    friendPostsPopup.style.display = "block"
    FriendFeedHeader.innerHTML = "These are posts of " + friendName
    observedName.value = friendName
    // get posts
    let response = await doFetch('/posts/getMorePosts/' + friendName)

    if (!response)
        return

    buildUserPosts(response, true, friendName, postListFriend)
}