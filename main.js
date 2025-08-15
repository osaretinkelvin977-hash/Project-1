Back end

// server.js

import express from "express";

import fs from "fs";

import path from "path";

import multer from "multer";

import cors from "cors";

import WebTorrent from "webtorrent";

const app = express();

const upload = multer({ dest: "uploads/" });

const PORT = 3000;

const client = new WebTorrent();

const DB_FILE = "torrents.json";

app.use(cors());

app.use(express.json());

let torrents = fs.existsSync(DB_FILE)

? JSON.parse(fs.readFileSync(DB_FILE))

: [];

function saveDB() {

fs.writeFileSync(DB_FILE, JSON.stringify(torrents, null, 2));

}

// Get all torrents

app.get("/torrents", (req, res) => {

let results = torrents;

if (req.query.q) {

const q = req.query.q.toLowerCase();

results = results.filter(t => t.name.toLowerCase().includes(q));

}

res.json({ results });

});

// Upload torrent or magnet link

app.post("/torrents", upload.single("file"), (req, res) => {

let magnetURI = null;

if (req.file) {

const torrentBuffer = fs.readFileSync(req.file.path);

magnetURI = client.add(torrentBuffer).magnetURI;

} else if (req.body.magnet) {

magnetURI = req.body.magnet;

}

const newTorrent = {

id: Date.now().toString(),

name: req.body.name || "Untitled",

year: req.body.year || "",

magnet: magnetURI,

size_bytes: 0,

created_at: new Date().toISOString()

};

torrents.push(newTorrent);

saveDB();

res.json({ message: "Torrent added", torrent: newTorrent });

});

// Download .torrent file

app.get("/torrents/:id/download", (req, res) => {

const torrent = torrents.find(t => t.id === req.params.id);

if (!torrent) return res.status(404).send("Torrent not found");

res.redirect(torrent.magnet);

});

// Stream video

app.get("/torrents/:id/stream", (req, res) => {

const torrent = torrents.find(t => t.id === req.params.id);

if (!torrent) return res.status(404).send("Torrent not found");

client.add(torrent.magnet, { path: "downloads" }, tor => {

const file = tor.files

.filter(f => f.name.endsWith(".mp4") || f.name.endsWith(".mkv"))

.sort((a, b) => b.length - a.length)[0]; // largest video file

if (!file) return res.status(404).send("No video file in torrent");

res.writeHead(200, {

"Content-Type": "video/mp4",

"Accept-Ranges": "bytes"

});

file.createReadStream().pipe(res);

});

});

app.listen(PORT, () => {

console.log(`Server running on http://localhost:${PORT}`);

});