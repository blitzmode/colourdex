const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    alert("Error accessing camera: " + err);
  });

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

  let rating = 1;
  const stars = Array.from(popup.querySelectorAll(".star"));

  function updateStars() {
    stars.forEach((s,i) =>
      s.style.backgroundImage = i < rating ? 'url(Icons/star.png)' : 'url(Icons/star_black.png)'
    );
  }
  updateStars();

  stars.forEach((s,i) => s.addEventListener("click", () => {
    rating = i + 1;
    updateStars();
  }));

  return new Promise((resolve) => {
    popup.querySelector("#save").addEventListener("click", async () => {
      popup.remove();
      const desc = popup.querySelector("#desc").value
      const result = await getData("rate", {hex: rgbToHex(r, g, b), score: rating, desc: desc, user: final});
      resolve(result);
    });
  });
}

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

document.getElementById('getColor').addEventListener('click', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const midX = Math.floor(canvas.width / 2);
  const midY = Math.floor(canvas.height / 2)

  const pixel = ctx.getImageData(midX, midY, 1, 1).data;
  const [r, g, b] = pixel;
  const hex = rgbToHex(r, g, b);

  async function AShow() {
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
  AShow()
});