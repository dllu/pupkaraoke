from flask import Flask, render_template, request, jsonify, redirect, url_for
from pathlib import Path
import subprocess
from urllib.parse import urlparse, parse_qs

app = Flask(__name__)

# Helper to extract YouTube video ID from URL
def get_video_id(url):
    parsed = urlparse(url)
    if 'youtu.be' in parsed.netloc:
        return parsed.path.lstrip('/')
    if 'youtube.com' in parsed.netloc:
        qs = parse_qs(parsed.query)
        return qs.get('v', [None])[0]
    return None

# In-memory song queue
song_queue = [
    ("asdf", "https://www.youtube.com/watch?v=tCDvOQI3pco"),
    ("qwer", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/host")
def host():
    return render_template("host.html", songs=song_queue)


@app.route("/enqueue", methods=["POST"])
def enqueue():
    song_url = request.form.get("song_url")
    name = request.form.get("name")
    if song_url and name:
        song_queue.append((name, song_url))
        # Download YouTube video server-side using yt-dlp
        video_id = get_video_id(song_url)
        if video_id:
            videos_dir = Path(app.static_folder) / 'videos'
            videos_dir.mkdir(parents=True, exist_ok=True)
            raw_path = videos_dir / f'{video_id}_raw.mp4'
            final_path = videos_dir / f'{video_id}.mp4'
            # Download and process if final file is missing
            if not final_path.exists():
                try:
                    # Download raw video
                    subprocess.run([
                        'yt-dlp',
                        '-f', 'bestvideo+bestaudio',
                        '--merge-output-format', 'mp4',
                        '-o', str(raw_path),
                        song_url
                    ], check=True)
                    # Add 0.5s audio delay via ffmpeg using itsoffset
                    temp_path = videos_dir / f'{video_id}_delayed.mp4'
                    subprocess.run([
                        'ffmpeg', '-y',
                        '-i', str(raw_path),
                        '-itsoffset', '0.5',
                        '-i', str(raw_path),
                        '-map', '0:v',
                        '-map', '1:a',
                        '-c', 'copy',
                        str(temp_path)
                    ], check=True)
                    # Move processed file into place and clean up
                    temp_path.replace(final_path)
                    raw_path.unlink(missing_ok=True)
                except subprocess.CalledProcessError as e:
                    print(f'Failed to download or process video {song_url}: {e}')
    return redirect(url_for("index"))


@app.route("/queue", methods=["GET"])
def get_queue():
    print(song_queue)
    return jsonify(song_queue)


@app.route("/dequeue")
def dequeue():
    if song_queue:
        return jsonify({"song_url": song_queue.pop(0)})
    return jsonify({"song_url": None})


if __name__ == "__main__":
    app.run(debug=True, port=6942)
