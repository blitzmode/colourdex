async function showFriends() {
    container.innerHTML = "No Friends Yet"
    var friends = await getData("user/friends", {id: uid});
    friends["table"].forEach(friend => {
        const newLine = addProfileLineTrue(friend["id"], friend["background"], friend["name"], null, document.getElementById("container"), false, friend["pic"])
        newLine.addEventListener('click', () => {
            loadPage("convo",friend["id"]);
        });
        newLine.classList.add("clickable");
    });
}
showFriends()