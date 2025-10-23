const container = document.getElementById("container");

var id = uid
if (window.pageData){ id = window.pageData }

async function showColours() {
    container.innerHTML = "No Colours Yet"
    var colours = await getData("user/colours", {id: id});
    colours["table"].forEach(colour => {
        const [r, g, b] = hexToRgb(colour[0]);
        showColour(r, g, b, container, colour[1], true);
    });
}

async function showFriends() {
    container.innerHTML = "No Friends Yet"
    var friends = await getData("user/friends", {id: id});
    friends["table"].forEach(friend => {
        const line = addProfileLineTrue(friend["id"], friend["background"], friend["name"], null, container, true, friend["pic"])
    });
}

async function showBadges() {
    container.innerHTML = ""
    var badges = await getData("user/badges", {id: id});
    badges["table"].forEach(badge => {
        container.insertAdjacentHTML("beforeend", `
        <div class="badge">
            <div class="pic"></div>
            <div class="name textfill"></div>
        </div>
        `);
        const newLine = container.lastElementChild;
        newLine.querySelector('.name').textContent = badge["name"]

        if (badge["done"]){
            if (id == uid){
                newLine.insertAdjacentHTML("beforeend", `
                    <div class="button clickable textfill">Equip</div>
                `);
                newLine.querySelector(".button").addEventListener('click', (e) => {
                    e.stopPropagation();
                    async function AF() {
                        newLine.querySelector(".button").remove();
                        await getData("pic", {user: final, badge: badge["id"]})
                        loadPage("home", null);
                    }
                    AF()
                });
            }
            
            newLine.querySelector(".pic").style.backgroundImage = "url(" + badge["path"] + ")"
            newLine.style.backgroundColor = `rgb(${255}, ${255}, ${255})`;
        }
    });
}

showColours();
addProfileLine(id, document.getElementById("top"));

document.getElementById("colours").addEventListener('click', () => {
    showColours();
});

document.getElementById("friends").addEventListener('click', () => {
    showFriends();
});

document.getElementById("badges").addEventListener('click', () => {
    showBadges();
});