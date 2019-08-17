let closeCollection: HTMLCollectionOf<HTMLElement> = document.getElementsByClassName("close") as HTMLCollectionOf<HTMLElement>;

let newPostClose: HTMLElement = closeCollection[0]
let feedClose: HTMLElement = closeCollection[1]
let yourPostsClose: HTMLElement = closeCollection[2]
let friendsClose: HTMLElement = closeCollection[3]

let newPostPopup = document.getElementById('newPostPopup');
let feedPopup = document.getElementById('feedPopup');
let yourPostsPopup = document.getElementById('yourPostsPopup');
let friendsPopup = document.getElementById('friendsPopup');

let newPost = document.getElementById('newPost');
let feed = document.getElementById('feed');
let yourPosts = document.getElementById('yourPosts');
let friends = document.getElementById('friends');

let postList = document.getElementById('postList');
let loadOlder = document.getElementById('loadOlder');
let refresh = document.getElementById('refresh');

// Adding closing and opening popups

//Closes
newPostClose.onclick = function () {
    newPostPopup.style.display = "none";
}

feedClose.onclick = function () {
    feedPopup.style.display = "none";
}

yourPostsClose.onclick = function () {
    yourPostsPopup.style.display = "none";
    resetDates()
}

friendsClose.onclick = function () {
    friendsPopup.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == newPostPopup || event.target == feedPopup || event.target == yourPostsPopup || event.target == friendsPopup) {
        newPostPopup.style.display = "none";
        feedPopup.style.display = "none";
        yourPostsPopup.style.display = "none";
        friendsPopup.style.display = "none";
        resetDates()
    }
}

//Opens
newPost.onclick = function () {
    newPostPopup.style.display = "block";
}

feed.onclick = function () {
    feedPopup.style.display = "block";
}

yourPosts.onclick = async function () {
    yourPostsPopup.style.display = "block";
    let response = await loadMorePosts()
    buildUserPosts(response, true)
}

friends.onclick = function () {
    friendsPopup.style.display = "block";
}

// Refresh and Load more for user

loadOlder.onclick = async function () {
    let response = await loadMorePosts()
    buildUserPosts(response, true)
}

refresh.onclick = async function () {
    let response = await refreshPosts()
    buildUserPosts(response, false)
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

// My posts update 

async function loadMorePosts() {
    let response
    try {
        let res = await fetch('/posts/getMorePosts');
        response = await res.json();
    } catch (err) {
        return null
    }
    return response
}

async function refreshPosts() {
    let response
    try {
        let res = await fetch('/posts/refresh');
        response = await res.json();
    } catch (err) {
        return null
    }
    return response
}

async function resetDates() {
    postList.innerHTML = ""
    try {
        await fetch('/resetDates');
    } catch (err) {
        return null
    }
}

// Functions build a list of posts if append is set to true,
// posts will be ppended at the end of the list, otherwise they
// will be prepended
function buildUserPosts(response, append: boolean): void {
    for (let idx in response) {
        let idxActual

        if (append) {
            idxActual = parseInt(idx)
        } else {
            idxActual = response.length - parseInt(idx) - 1
        }

        let node = document.createElement("LI");
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
            postList.appendChild(node);
        } else {
            postList.prepend(node);
        }
    }
}