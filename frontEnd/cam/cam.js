const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const indicator = document.getElementById('center-indicator');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Start the camera feed
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.addEventListener('play', () => {
      updateIndicator();
    });
  })
  .catch((err) => {
    alert("Error accessing camera: " + err);
  });

// Function to constantly update the color indicator
function updateIndicator() {
  if (video.readyState >= 2) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    canvas.width = vw;
    canvas.height = vh;
    ctx.drawImage(video, 0, 0, vw, vh);

    // middle pixel
    const cx = Math.floor(vw / 2);
    const cy = Math.floor(vh / 2);
    const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;

    // update circle color
    indicator.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    const rect = video.getBoundingClientRect();

    indicator.style.left = `${rect.width / 2}px`;
    indicator.style.top = `${rect.height / 2}px`;
  }

  requestAnimationFrame(updateIndicator);
}


// Show a rating popup for a captured colour and return the result
async function showRating(r, g, b, name) {
  _holder.innerHTML = `
    <div id="rating">
      <div id="colour" style="background-color: rgb(${r},${g},${b})"></div>
      <p id="name">${name}</p>
      <div id="stars">
        ${[0,1,2,3,4].map(i => `<div class="star" style="left:${i*40+10}px"></div>`).join('')}
      </div>
      <textarea id="desc" placeholder="How would you describe this colour?"></textarea>
      <button id="save" class="clickable">Save</button>
    </div>
  `;

  const popup = _holder.querySelector("#rating");

  // Default rating and star elements
  let rating = 1;
  const stars = Array.from(popup.querySelectorAll(".star"));

  function updateStars() {
    stars.forEach((s,i) =>
      s.style.backgroundImage = i < rating ? 'url(Icons/star.png)' : 'url(Icons/star_black.png)'
    );
  }
  updateStars();

  // Clicking a star updates the rating
  stars.forEach((s,i) => s.addEventListener("click", () => {
    rating = i + 1;
    updateStars();
  }));

  // Saves the rating
    popup.querySelector("#save").addEventListener("click", async () => {
      popup.remove();
      const desc = popup.querySelector("#desc").value
      getData("rate", {hex: rgbToHex(r, g, b), score: rating, desc: desc, user: final});
    });
}

// Prompt the user to name a newly discovered colour and save it
async function showNameCard(r, g, b, hex) {
  _holder.innerHTML = `
    <div id="nameCard">
      <div id="title">Frist descrovey!</div>
      <div id="colour" style="background-color: rgb(${r},${g},${b})"></div>
      <input id="name" placeholder="Enter name" />
      <button id="save" class="clickable">Save</button>
    </div>
  `;
  const popup = _holder.querySelector("#nameCard");

  // Resolve with the entered name when saved
  return new Promise((resolve) => {
    popup.querySelector("#save").addEventListener("click", async () => {
      const name = popup.querySelector("#name").value;
      if (!name) return;
      popup.remove();
      await getData("name", {hex: hex, name: name});
      resolve(name);
    });
  });
}

// Handler for "Get Color" button: capture center pixel from video and handle it
document.getElementById('getColor').addEventListener('click', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // get the pixel at the center of the canvas
  const midX = Math.floor(canvas.width / 2);
  const midY = Math.floor(canvas.height / 2)

  const pixel = ctx.getImageData(midX, midY, 1, 1).data;
  const [r, g, b] = pixel;
  const hex = rgbToHex(r, g, b);

  // Lookup info for this colour, prompt naming if new, then display & rate
  async function AS() {
    const info = await getData("find", {hex: hex});
    if (info){
      if (info.name == null)
      {
        info.name = await showNameCard(r, g, b, hex)
      }
      showColour(r, g, b, document.getElementById("container"), info.name, true);
      showRating(r, g, b, info.name);
    }
  }
  AS()
});