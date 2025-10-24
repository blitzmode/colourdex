// ID if user the user is having a chat with (provided by the page)
const id = window.pageData

// Append a single chat bubble to the chat area.
function addText(sent, message, colour, name){
    // Insert a left or right bubble depending on sender
    if (sent) {document.getElementById("chat").insertAdjacentHTML("beforeend", '<div class="bubble right clickable"></div>')}
    else {document.getElementById("chat").insertAdjacentHTML("beforeend", '<div class="bubble left clickable"></div>')}
    const newLine = document.getElementById("chat").lastElementChild;

    newLine.textContent = message

    // Convert hex color to rgb and apply as background
    const [r, g, b] = hexToRgb(colour);
    newLine.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    newLine.style.setProperty("--bubble-color", `rgb(${r}, ${g}, ${b})`);

    // Choose readable text color based on perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    newLine.style.color = brightness > 128 ? "black" : "white";

    // Attach the event to show rattings when bubble is clicked
    addShowRatesEvent(newLine, name, r, g, b);
}

// Open the stamp picker and send a colored message when a stamp is selected
async function AF() {
    _holder.innerHTML = `
        <div id="stamps">
            <div id="title">Select A Stamp</div>
            <div id="list"></div>
        </div>
    `
    var colours = await getData("user/colours", {id: uid});
    colours["table"].forEach(colour => {
        const [r, g, b] = hexToRgb(colour[0]);
        // Render a color tile; clicking sends the message with that hex
        showColour(r, g, b, _holder.querySelector("#list"), colour[1], false).addEventListener("click", async () => {
            const message = document.getElementById("message-input").value
            await getData("message/send", { user: final, other: id, message: message, hex: colour[0] });
            _holder.innerHTML="";
            addText(true, message, colour[0], colour[1])
            document.getElementById("message-input").value = ""
        });
    });
}

// Send button opens the stamp picker
document.getElementById("send").querySelector("#icon").addEventListener('click', () => {AF()});

// Load existing conversation messages and display them
async function AF2() {
    const texts = await getData("message/find", { user: final, other: id });
    texts["table"].forEach(text => {addText(text["sent"], text["message"], text["colour"], text["name"]) });
}
AF2()