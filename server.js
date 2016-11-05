const fs = require('fs');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser'); // Loads the piece of middleware for managing the settings
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const io = require('socket.io');

const app = express();
const server = http.createServer(app);

// Load socket.io connection
const sio = io.listen(server);

// Do routing with express
app.get('/', (req, res) => {
  res.render('page.ejs', {
    // Vars would go here
  });
});

app.use((req, res) => {
  res.redirect('/');
});

// Listen to events with socket connection
sio.sockets.on('connection', (socket) => {
  const data = JSON.parse(fs.readFileSync('./database.json'));


  socket.on('update', (disease) => {
    let symptoms;
    if (disease.name in data) {
      symptoms = new Set([...data[disease.name].symptoms, ...disease.symptoms]);
      symptoms = [...symptoms];
    } else {
      symptoms = disease.symptoms;
    }
    Object.assign(data, {
      [disease.name]: {
        symptoms
      }
    });
    fs.writeFile('./database.json', JSON.stringify(data));
  });

  socket.on('searchByDisease', (disease) => {
    if ('disease' in data) {
      socket.emit('foundDisease', {
        name: disease,
        symptoms: data[disease].symptoms
      });
    } else {
      socket.emit('notFound', disease);
    }
  });

  socket.on('searchBySymptom', (symptomCriteria) => {
    let found = false;
    for (const disease in data) {
      if (data[disease].symptoms.includes(symptomCriteria[0])) {
        socket.emit('foundDisease', {
          name: disease,
          symptoms: data[disease].symptoms
        });
        found = true;
      }
    }
    if (!found) {
      socket.emit('notFound', symptomCriteria);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    fs.writeFile('./database.json', JSON.stringify(data));
  });
});


server.listen(8080);
