require('dotenv').config();

const express = require('express');

const multer = require('multer');

const bodyParser = require('body-parser');

const fs = require('fs');

const path = require('path');



const app = express();

const upload = multer({ dest: 'uploads/' });



app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('./'));

app.set('view engine', 'ejs');



const playlistFolder = './playlist';



// Ensure playlist folder exists

if (!fs.existsSync(playlistFolder)) {

  fs.mkdirSync(playlistFolder);

}



// Helper functions

const saveTextFile = (filename, content) => {

  fs.writeFileSync(path.join(playlistFolder, filename), content);

};



const removeFile = (filename) => {

  const filePath = path.join(playlistFolder, filename);

  if (fs.existsSync(filePath)) {

    fs.unlinkSync(filePath);

  }

};



// Get current playlist information

const getCurrentPlaylist = () => {

  const files = fs.readdirSync(playlistFolder);

  const playlist = {

    title: fs.existsSync(path.join(playlistFolder, 'title.txt')) 

      ? fs.readFileSync(path.join(playlistFolder, 'title.txt'), 'utf-8').trim() 

      : '',

    artist: fs.existsSync(path.join(playlistFolder, 'artist.txt')) 

      ? fs.readFileSync(path.join(playlistFolder, 'artist.txt'), 'utf-8').trim() 

      : '',

    bio: fs.existsSync(path.join(playlistFolder, 'bio.txt')) 

      ? fs.readFileSync(path.join(playlistFolder, 'bio.txt'), 'utf-8').trim() 

      : '',

    links: fs.existsSync(path.join(playlistFolder, 'links.txt')) 

      ? fs.readFileSync(path.join(playlistFolder, 'links.txt'), 'utf-8').trim() 

      : '',

    coverArt: fs.existsSync(path.join(playlistFolder, 'coverart.jpg')) 

      ? '/playlist/coverart.jpg' 

      : '',

    tracks: [],

  };



  const trackFiles = files.filter((file) => file.startsWith('track') && file.endsWith('.mp3'));

  trackFiles.forEach((track) => {

    const trackNum = track.match(/\d+/)[0];

    const image = files.includes(`image${trackNum}.jpg`) ? `/playlist/image${trackNum}.jpg` : '';

    const bio = files.includes(`bio${trackNum}.txt`) ? fs.readFileSync(path.join(playlistFolder, `bio${trackNum}.txt`), 'utf-8').trim() : '';



    playlist.tracks.push({

      num: trackNum,

      track,

      image,

      bio,

    });

  });



  return playlist;

};



// Routes

app.get('/', (req, res) => {

  const playlist = getCurrentPlaylist();

  const nextTrackNum = playlist.tracks.length + 1;

  res.render('index', { playlist, nextTrackNum });

});



app.post('/upload-cover', upload.single('cover'), (req, res) => {

  removeFile('coverart.jpg');

  fs.renameSync(req.file.path, path.join(playlistFolder, 'coverart.jpg'));

  res.redirect('/');

});



app.post('/upload-track', upload.fields([

  { name: 'track', maxCount: 1 },

  { name: 'image', maxCount: 1 },

]), (req, res) => {

  const trackNum = req.body.trackNum;

  const trackPath = path.join(playlistFolder, `track${trackNum}.mp3`);

  const imagePath = path.join(playlistFolder, `image${trackNum}.jpg`);

  const bioPath = path.join(playlistFolder, `bio${trackNum}.txt`);



  removeFile(`track${trackNum}.mp3`);

  if (req.files.track) {

    fs.renameSync(req.files.track[0].path, trackPath);

  }



  removeFile(`image${trackNum}.jpg`);

  if (req.files.image) {

    fs.renameSync(req.files.image[0].path, imagePath);

  }



  if (req.body.bio) {

    saveTextFile(`bio${trackNum}.txt`, req.body.bio);

  }



  res.redirect('/');

});



app.post('/delete-track', (req, res) => {

  const trackNum = req.body.trackNum;

  removeFile(`track${trackNum}.mp3`);

  removeFile(`image${trackNum}.jpg`);

  removeFile(`bio${trackNum}.txt`);

  res.redirect('/');

});



app.post('/update-info', (req, res) => {

  saveTextFile('title.txt', req.body.title);

  saveTextFile('artist.txt', req.body.artist);

  saveTextFile('bio.txt', req.body.bio);

  saveTextFile('links.txt', req.body.links);

  res.redirect('/');

});

const {publish} = require('./publish.js')

app.post('/publish', async (req, res) => {

  // Dummy publish function

  const publishMessage = await publish();

  res.send(publishMessage);

});



app.listen(3000, () => {

  console.log('Server started on http://localhost:3000');

});