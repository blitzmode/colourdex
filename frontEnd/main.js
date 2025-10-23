const API_BASE = "http://localhost:5000";

// Send a POST request to the backend API and return parsed JSON.
async function getData(link, give){
    try {
        const response = await fetch(`${API_BASE}/${link}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(give)
        });
        const JResponce = await response.json();
        if (JResponce["error"]){
            alert(JResponce["error"])
            return {}
        }
        console.log(JSON.stringify(JResponce));
        return JResponce;
    } 
    catch (error) {
        console.error('Error while geting data:', error);
    }
}


// ^^^^ API ^^^^
// vvvv Main vvv


// Convert RGB values to a hex string.
function rgbToHex(r, g, b) {
  return (
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// Convert a hex colour string to an [r, g, b] array.
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [ r, g, b ];
}

// Create and append a profile line (user ribbon) element into the given container.
function addProfileLineTrue(id, background, name, friend, container, clickable, pic){
    Array.from(container.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
    });

    container.insertAdjacentHTML("beforeend", `
    <div class="profileLine">
        <div class="pic"></div>
        <div class="name textfill"></div>
    </div>
    `);
    
    const newLine = container.lastElementChild;
    if (background){
        [r, g, b] = hexToRgb(background)
        newLine.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }
    if(pic){
        newLine.querySelector(".pic").style.backgroundImage = "url(" + pic + ")"
    }
    newLine.querySelector('.name').textContent = name
    
    if(clickable){
        newLine.addEventListener('click', () => {
            loadPage("home",id);
        });
        newLine.classList.add("clickable");
    }

    if (friend){
        if (friend.open){
            newLine.insertAdjacentHTML("beforeend", `
                <div class="button clickable textfill">${friend.mes}</div>
            `);
            newLine.querySelector(".button").addEventListener('click', (e) => {
                e.stopPropagation();
                newLine.querySelector(".button").remove();

                async function AF() {
                    mes = await getData("friend", {user: final, other: id})
                    if (mes["mes"]){
                        newLine.insertAdjacentHTML("beforeend", `
                            <div class="mes textfill">${mes.mes}</div>
                        `);
                    }
                }
                AF()
                
            });
        }
        else{
            newLine.insertAdjacentHTML("beforeend", `
                <div class="mes textfill">${friend.mes}</div>
            `);
        }
    }

    return newLine;
}

// Fetch user info and create a profile line for the given user id.
async function addProfileLine(id, container){
    user = await getData("user", {view: uid, other: id})
    addProfileLineTrue(id, user["background"], user["name"], user["friend"], container, false, user["pic"])
}

const _holder = document.getElementById("holder")

// Attach click handler to show ratings for a colour.
function addShowRatesEvent(button, name, r, g, b){
    button.addEventListener('click', (e) => {
        async function AF() {
            const rates = await getData("find/rate", {hex: rgbToHex(r, g, b), view: uid})
            if (!rates["table"] || rates["table"].length == 0){return}

            _holder.innerHTML = `
                <div id="rates">
                    <div id="pic" style="background-color: rgb(${r}, ${g}, ${b});"></div>
                    <div id="name">${name}</div>
                    <div id="rate"></div>
                    <div id="background" class="textfill clickable">Set As Background</div>
                    <div id="close" class="clickable"></div>
                </div>
            `;

            _holder.querySelector("#background").addEventListener("click", async () => {
                getData("background", {user: final, hex: rgbToHex(r, g, b)})
                loadPage("home", null)
            });

            _holder.querySelector("#close").addEventListener("click", async () => {
                _holder.innerHTML = ""
            });

            var number = 0;
            function showRate(){
                const rateData = rates["table"][number]
                const rate = _holder.querySelector("#rate")
                rate.innerHTML = ""
                addProfileLineTrue(rateData["id"], rateData["background"], rateData["name"], rateData["friend"], rate, true)
                rate.insertAdjacentHTML("beforeend", `
                    <div id="stars">
                        ${[0,1,2,3,4].map(i => `<div class="star" style="left:${(i-2) * 5 + 30}vh"></div>`).join('')}
                    </div>
                    <div id="desc">${rateData["desc"]}</div>
                `);
                const stars = Array.from(rate.querySelectorAll(".star"));
                stars.forEach((s,i) =>
                    s.style.backgroundImage = i < rateData["score"] ? 'url(Icons/star.png)' : 'url(Icons/star_black.png)'
                );
                if(number < rates["table"].length - 1)
                {
                    rate.insertAdjacentHTML("beforeend", `<div id="next" class="clickable"></div>`);
                    rate.querySelector("#next").addEventListener("click", async () => {
                        number += 1;
                        showRate();
                    });
                }
                if(number > 0)
                {
                    rate.insertAdjacentHTML("beforeend", `<div id="last" class="clickable"></div>`);
                    rate.querySelector("#last").addEventListener("click", async () => {
                        number -= 1;
                        showRate();
                    });
                }
            }
            showRate()
        }
        AF()
    });
}

// Render a colour icon.
function showColour(r, g, b, container, name, clickable) {
    Array.from(container.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
    });

    container.insertAdjacentHTML("beforeend", `
        <div id="dis" class="clickable">
            <div id="colour" style="background-color: rgb(${r}, ${g}, ${b});"></div>
            <p id="name">${name}</p>
        </div>
    `);

    const newLine = container.lastElementChild;

    if(clickable){addShowRatesEvent(newLine, name, r, g, b)}
    return newLine;
}

var page = document.getElementById("page");
var oldJS = null;
var oldCSS = null;

// Load HTML/CSS/JS in the page element and inject it into the document.
async function loadPage(pageName, dataForJS) {
    _holder.innerHTML = ""

    const fileName = pageName + "/" + pageName;

    try {
        const htmlResp = await fetch(fileName + ".html");
        if (!htmlResp.ok) throw new Error("HTML not found");
        const html = await htmlResp.text();
        page.innerHTML = html;
    } catch {
        console.warn("No HTML file for", pageName);
        page.innerHTML = "";
    }

    if (oldCSS) oldCSS.remove();
    if (oldJS) oldJS.remove();

    try {
        const cssResp = await fetch(fileName + ".css", { method: "HEAD" });
        if (cssResp.ok) {
            const cssLink = document.createElement("link");
            cssLink.rel = "stylesheet";
            cssLink.type = "text/css";
            cssLink.href = fileName + ".css?cacheBust=" + Date.now();
            document.head.appendChild(cssLink);
            oldCSS = cssLink;
        } else {
            oldCSS = null;
        }
    } catch {
        console.warn("CSS check failed for", pageName);
    }

    try {
        const jsResp = await fetch(fileName + ".js", { method: "HEAD" });
        if (jsResp.ok) {
            window.pageData = dataForJS;
            const jsScript = document.createElement("script");
            jsScript.src = fileName + ".js?cacheBust=" + Date.now();
            jsScript.type = "module";
            document.body.appendChild(jsScript);
            oldJS = jsScript;
        } else {
            oldJS = null;
        }
    } catch {
        console.warn("JS check failed for", pageName);
    }
}

var final;
var uid;
// Authenticate (login/signup) and initialize session state on success.
async function Login(type, userName, password){
    var data = await getData(type, {name: userName, pas: password});
    if (data["uid"]){
        uid = data.uid
        final = {name: userName, pas: password};
        loadPage("home", null);
        document.getElementById("login").remove();
    }
}

var Lcore = document.getElementById("logincore");

// Render the log-in popup.
function SwitchToLogIn() {
    Lcore.innerHTML = `
        <div id="title">Log In</div>
        <input id="name" placeholder="Username" />
        <input id="password" placeholder="Password" type="password" />
        <button id="button" type="button">Log In</button>
        <span id="signup">Sign Up</span>
    `;

    const uname = Lcore.querySelector("#name");
    const password = Lcore.querySelector("#password");
    const button = Lcore.querySelector("#button");
    const signup = Lcore.querySelector("#signup");

    button.addEventListener('click', () => {
        Login("login", uname.value, password.value);
    });

    signup.addEventListener('click', () => {
        SwitchToSignUp();
    });
}

// Render the sign-up popup.
function SwitchToSignUp() {
    Lcore.innerHTML = `
        <div id="title">Sign Up</div>
        <input id="name" placeholder="Username" />
        <input id="password" placeholder="Password" type="password" />
        <input id="cpassword" placeholder="Confirm Password" type="password" />
        <button id="button" type="button">Sign Up</button>
        <span id="loginBack">Back to Log In</span>
    `;

    const uname = Lcore.querySelector("#name");
    const password = Lcore.querySelector("#password");
    const cpassword = Lcore.querySelector("#cpassword");
    const button = Lcore.querySelector("#button");
    const loginBack = Lcore.querySelector("#loginBack");

    button.addEventListener('click', () => {
        if (password.value !== cpassword.value) {
            alert("Passwords must match");
            return;
        }
        Login("signup", uname.value, password.value)
    });

    loginBack.addEventListener('click', () => {
        SwitchToLogIn();
    });
}

SwitchToLogIn();

// Resize text to fill its parent's height (used by elements with class textfill).
function updateTextFill(el) {
  const parentHeight = el.offsetHeight;
  el.style.fontSize = `${parentHeight * 0.7}px`;
}
document.querySelectorAll('.textfill').forEach(updateTextFill);
window.addEventListener('resize', () => {
  document.querySelectorAll('.textfill').forEach(updateTextFill);
});
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.classList.contains('textfill')) updateTextFill(node);
        node.querySelectorAll && node.querySelectorAll('.textfill').forEach(updateTextFill);
      }
    });
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});