var player;
var currentQueue = [];
var currentVideoIndex = 0;
var lastQueueLength = 0;
var apiKey = 'your_api_key';
var isPlaying = false;


function updatePlayerSize() {
  var screenWidth = window.innerWidth;
  var playerWidth = screenWidth - 400;  // Subtract 400px from the screen width
  var playerHeight = playerWidth * 9 / 16;  // Maintain a 16:9 aspect ratio

  if (player) {
    player.style.width = playerWidth + 'px';
    player.style.height = playerHeight + 'px';
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
  if (currentQueue.length > currentVideoIndex) {
    isPlaying = true;
    var videoId = extractVideoID(currentQueue[currentVideoIndex][1]);
    var videoSrc = '/static/videos/' + videoId + '.mp4';
    player.src = videoSrc;
    player.load();
    player.play();
    currentVideoIndex++;
    updateQueueDisplay();
    return true;
  }
  return false;
}


function updateQueueDisplay() {
  let queueDisplay = document.getElementById('queue');
  queueDisplay.innerHTML = '';  // Clear existing entries

  if (currentVideoIndex > 0) {
    let currentSong = currentQueue[currentVideoIndex - 1];
    fetchVideoDetails(extractVideoID(currentSong[1]), currentSong[0])
      .then(videoDetails => {
        let currentSongNode = document.createElement('tr');
        currentSongNode.innerHTML = `
          <th> </th>
          <th class="videoname">now playing</th>
          <th class="requester">requester</th>
          `;
        queueDisplay.appendChild(currentSongNode);

        let node = document.createElement('tr');
        node.innerHTML = `
          <td><img src="${videoDetails.thumbnail}"></td>
          <td class="videoname">${videoDetails.title}</td>
          <td class="requester">${videoDetails.requester}</td>
          `;
        queueDisplay.appendChild(node);

        let nextSongNode = document.createElement('tr');
        nextSongNode.innerHTML = `
          <th> </th>
          <th class="videoname">up next</th>
          <th class="requester">requester</th>
          `;
        queueDisplay.appendChild(nextSongNode);
      });
  }

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
const videoCache = {};

function fetchVideoDetails(videoId, requester) {
  const cacheKey = `${videoId}_${requester}`;

  // Check if the response for these parameters is already cached
  if (videoCache[cacheKey]) {
    return Promise.resolve(videoCache[cacheKey]);
  }
  return new Promise((resolve, reject) => {
    let url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.items.length > 0) {
          let item = data.items[0];
          const videoDetails = {
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default.url,
            requester: requester
          };

          // Cache the fetched result using the unique cacheKey
          videoCache[cacheKey] = videoDetails;

          resolve(videoDetails);
        } else {
          reject('No video details found');
        }
      })
      .catch(error => reject(error));
  });
}

function extractVideoID(url) {
  let videoId = null;
  if (url.includes('youtu.be')) {
    // Handle youtu.be short URLs
    videoId = url.split('youtu.be/')[1];
    // Remove any additional parameters
    videoId = videoId.split('?')[0];
  } else if (url.includes('youtube.com')) {
    // Handle regular YouTube URLs
    const urlParams = new URLSearchParams(new URL(url).search);
    videoId = urlParams.get('v');
  }
  return videoId;
}

window.addEventListener('resize', updatePlayerSize);
// Initialize player and queue on page load
document.addEventListener('DOMContentLoaded', function() {
  player = document.getElementById('player');
  window.addEventListener('resize', updatePlayerSize);
  updatePlayerSize();
  fetch('/queue').then(res => res.json()).then(data => {
    currentQueue = data;
    lastQueueLength = data.length;
    updateQueueDisplay();
    playNextSong();
  });
  setInterval(checkQueue, 3000);
  player.addEventListener('ended', function() {
    isPlaying = playNextSong();
  });
});
