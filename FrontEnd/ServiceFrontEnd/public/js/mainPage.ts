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

// Adding closing and opening popups

//Closes
newPostClose.onclick = function() {
    newPostPopup.style.display = "none";
}

feedClose.onclick = function () {
    feedPopup.style.display = "none";
}

yourPostsClose.onclick = function () {
    yourPostsPopup.style.display = "none";
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
    }
}

//Opens
newPost.onclick = function () {
    newPostPopup.style.display = "block";
}

feed.onclick = function () {
    feedPopup.style.display = "block";
}

yourPosts.onclick = function () {
    yourPostsPopup.style.display = "block";
}

friends.onclick = function () {
    friendsPopup.style.display = "block";
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
        return true;
    }
}

async function asyncAlert(message) {
    alert(message)
}