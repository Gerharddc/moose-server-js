import express from "express";
import type { $Request } from "express";
import fileUpload from "express-fileupload";
import saveUploadedFile from "./files";

const app = express();
app.use(fileUpload());

app.get('/test', function (req: $Request, res) {
  res.send('Test response!')
});

app.listen(80, function () {
  console.log('Example app listening on port 3000!')
});

app.post('/upload', function (req: $Request, res) {
    if (!req.files)
      return res.status(400).send('No files were uploaded.');

    try {
      req.files.forEach((file) => saveUploadedFile(file));

      res.send('Success');
    } catch (e) {
      return res.status(500).send(e.message);
    }
});

import { HandleRequest } from './handlers';
import { AddClient, RemoveClient } from './notify';

const WebSocketServer = require('uws').Server;
const wss = new WebSocketServer({ port: 8080 });
console.log('Started websocket server');

wss.on('connection', ws => {
  AddClient(ws);
  console.log('New connection');

  ws.on('message', message => {
    console.log('message: ' + message);

    ws.send(HandleRequest(message, ws));
  });

  ws.on('close', (code, reason) => {
    RemoveClient(ws);
    console.log('Connection closed');
  });
});