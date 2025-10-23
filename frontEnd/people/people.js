// Container for displaying user profiles
var container = document.getElementById("container");

// Search and display users based on search term
async function showUsers(term) {
    container.innerHTML = "Loading.."
    // Fetch user data from server
    const users = await getData("search", {view: uid, term: term})
    container.innerHTML = ""
    // Create profile line (user ribbon) for each user
    users["users"].forEach(user => {
        console.log(user["background"])
        const line = addProfileLineTrue(user["id"], user["background"], user["name"], user["friend"], container, true, user["pic"]);
    });
}

// Handle search icon click 
document.getElementById("icon").addEventListener('click', () => {
    const term = document.getElementById("search").value
    showUsers(term);
});