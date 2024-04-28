var player;
var currentQueue = [];
var currentVideoIndex = 0;
var lastQueueLength = 0;
var apiKey = 'your_api_key'';
var isPlaying = false;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '480',
    width: '720',
    videoId: '',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    },
    playerVars: {
      'autoplay': 1,  // Enable autoplay by setting this to 1.
      'controls': 1,  // Show player controls.
      'rel': 0,       // Do not show related videos when playback ends.
      'modestbranding': 1, // Limit YouTube branding.
      'iv_load_policy': 3 // Disable annotations.
    },
  });
}

function updatePlayerSize() {
  var screenWidth = window.innerWidth;
  var playerWidth = screenWidth - 400;  // Subtract 400px from the screen width
  var playerHeight = playerWidth * 9 / 16;  // Maintain a 16:9 aspect ratio

  if (player && player.setSize) {
    player.setSize(playerWidth, playerHeight);
  }
}

function onPlayerReady(event) {
  setInterval(checkQueue, 3000); // Poll every 5 seconds
  player.playVideo();
  updatePlayerSize();
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    isPlaying = playNextSong();
  }
}

function checkQueue() {
  fetch('/queue')
    .then(response => response.json())
    .then(data => {
      if (data.length !== currentQueue.length) {
        currentQueue = data;
      }
    });

  if (currentQueue.length > lastQueueLength) {
    updateQueueDisplay();
    lastQueueLength = currentQueue.length;
  }
}

function playNextSong() {
  if (currentQueue.length > 0 && currentVideoIndex < currentQueue.length) {
    isPlaying = true;
    player.loadVideoById(extractVideoID(currentQueue[currentVideoIndex][1]));
    currentVideoIndex++;
    updateQueueDisplay();
    return true;
  }
  return false;
}


function updateQueueDisplay() {
  let queueDisplay = document.getElementById('queue');
  queueDisplay.innerHTML = '';  // Clear existing entries

  // Create an array of promises for fetching video details
  let promises = currentQueue.slice(currentVideoIndex).map(videoURL => {
    let videoId = extractVideoID(videoURL[1]);
    return fetchVideoDetails(videoId, videoURL[0]);
  });

  // Wait for all promises to resolve
  Promise.all(promises)
    .then(results => {
      results.forEach(videoDetails => {
        let node = document.createElement('tr');
        node.innerHTML = `
          <td><img src="${videoDetails.thumbnail}"></td>
          <td class="videoname">${videoDetails.title}</td>
          <td class="requester">${videoDetails.requester}</td>
          `;
        queueDisplay.appendChild(node);
      });
    })
    .catch(error => {
      console.error('Failed to fetch video details:', error);
    });
}

function fetchVideoDetails(videoId, requester) {
  return new Promise((resolve, reject) => {
    let url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.items.length > 0) {
          let item = data.items[0];
          resolve({
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default.url,
            requester: requester
          });
        } else {
          reject('No video details found');
        }
      })
      .catch(error => reject(error));
  });
}

function extractVideoID(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
}

window.addEventListener('resize', updatePlayerSize);
window.setInterval(function() {
  if (player && player.getPlayerState() < 1 && !isPlaying) {
    console.log(player.getPlayerState());
    playNextSong();
  }
}, 1000);
