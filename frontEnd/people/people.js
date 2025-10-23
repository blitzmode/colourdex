var container = document.getElementById("container");

async function showUsers(term) {
    container.innerHTML = "Loading.."
    const users = await getData("search", {view: uid, term: term})
    container.innerHTML = ""
    users["users"].forEach(user => {
        console.log(user["background"])
        const line = addProfileLineTrue(user["id"], user["background"], user["name"], user["friend"], container, true, user["pic"]);
    });
}

document.getElementById("icon").addEventListener('click', () => {
    const term = document.getElementById("search").value
    showUsers(term);
});