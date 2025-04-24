let heartbeatInterval;
let ws;
let isKpop = true;

const audio = document.getElementById("audio");
const audioSource = document.getElementById("audioSource");
const toggleButton = document.getElementById("toggleButton");
const songName = document.getElementById("songName");
const songArtist = document.getElementById("songArtist");
const songAlbum = document.getElementById("songAlbum");
const songDuration = document.getElementById("songDuration");
const radioListeners = document.getElementById("radioListeners");
const albumCover = document.getElementById("albumCover");

function clearMetadata() {
  songName.innerHTML = `<b>Song Name:</b> Loading...`;
  songArtist.innerHTML = `<b>Artist:</b> Loading...`;
  songAlbum.innerHTML = `<b>Album:</b> Loading...`;
  songDuration.innerHTML = `<b>Duration:</b> Loading...`;
  radioListeners.innerHTML = `<b>Listeners:</b> Loading...`;
  albumCover.style.display = "none";
}

function heartbeat(interval) {
  heartbeatInterval = setInterval(() => {
    ws.send(
      JSON.stringify({
        op: 9
      })
    );
  }, interval);
}

function connect() {
  const wsUrl = isKpop
    ? "wss://listen.moe/kpop/gateway_v2"
    : "wss://listen.moe/gateway_v2";

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  };

  ws.onmessage = (message) => {
    if (!message.data.length) return;

    let response;
    try {
      response = JSON.parse(message.data);
    } catch (error) {
      return;
    }

    switch (response.op) {
      case 0:
        ws.send(
          JSON.stringify({
            op: 9
          })
        );
        heartbeat(response.d.heartbeat);
        break;

      case 1:
        if (
          response.t !== "TRACK_UPDATE" &&
          response.t !== "TRACK_UPDATE_REQUEST" &&
          response.t !== "QUEUE_UPDATE" &&
          response.t !== "NOTIFICATION"
        )
          break;

        console.log(response.d); // Metadata for debugging

        const song = response.d.song;
        const album = song.albums.length ? song.albums[0] : null;

        songName.innerHTML = `<b>Song Name:</b> ${song.title}`;
        songArtist.innerHTML = `<b>Artist:</b> ${
          song.artists[0].nameRomaji || song.artists[0].name
        }`;
        songDuration.innerHTML =
          song.duration != 0
            ? `<b>Duration:</b> ${
                (song.duration - (song.duration %= 60)) / 60 +
                (9 < song.duration ? ":" : ":0") +
                song.duration
              }`
            : "<b>Duration:</b> Unknown";

        songAlbum.innerHTML = album
          ? `<b>Album:</b> ${album.name}`
          : "<b>Album:</b> None";

        radioListeners.innerHTML = `<b>Listeners:</b> ${response.d.listeners}`;

        const albumCoverUrl = album?.image
          ? `https://cdn.listen.moe/covers/${album.image}`
          : null;

        if (albumCoverUrl) {
          albumCover.src = albumCoverUrl;
          albumCover.style.display = "block";
        } else {
          albumCover.style.display = "none";
        }

        break;

      default:
        break;
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    if (ws) {
      ws.close();
      ws = null;
    }
    setTimeout(() => connect(), 5000); // Reconnect after 5 seconds
  };
}

function toggleStream() {
  isKpop = !isKpop;
  audioSource.src = isKpop
    ? "https://listen-moe-proxy.jackjona.workers.dev?kpop=true"
    : "https://listen-moe-proxy.jackjona.workers.dev";
  audio.load();
  audio.play().catch((error) => console.error("Error playing stream:", error));

  toggleButton.textContent = `Switch to ${isKpop ? "J-POP" : "K-POP"}`;
  console.log(`Switched to ${isKpop ? "K-POP" : "J-POP"} stream`);

  // Clear metadata when switching streams
  clearMetadata();

  if (ws) {
    ws.close();
  }
  connect();
}

toggleButton.addEventListener("click", toggleStream);

connect();

// Remove the odepen warning
if (window.parent && window.parent.document) {
  const refererWarning = window.parent.document.querySelector(
    ".referer-warning"
  );
  if (refererWarning) {
    refererWarning.remove(); // Remove the div
    console.log("Referer warning removed from parent page.");
  } else {
    console.log("Referer warning div not found in parent page.");
  }
}
