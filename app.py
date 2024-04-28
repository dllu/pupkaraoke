from flask import Flask, render_template, request, jsonify, redirect, url_for

app = Flask(__name__)

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
