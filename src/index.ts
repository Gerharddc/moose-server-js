import * as express from "express";
import * as fileUpload from "express-fileupload";
import { saveUploadedFile } from "./files";

const app = express();
app.use(fileUpload());

app.get("/test", (req, res) => {
  res.send("Test response!");
});

try {
  app.listen(8000, () => {
    console.log("Example app listening!");
  });
} catch (e) {
  console.log("Express-listen-error: e");
}

app.post("/upload", (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  try {
    req.files.forEach((file) => saveUploadedFile(file));

    res.send("Success");
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

import { HandleRequest } from "./handlers";
import { AddClient, RemoveClient } from "./notify";

import { Server as WebSocketServer} from "uws";
const wss = new WebSocketServer({ port: 8080 });
console.log("Started websocket server");

wss.on("connection", (ws) => {
  AddClient(ws);
  console.log("New connection");

  ws.on("message", (message) => {
    console.log("message: " + message);

    ws.send(HandleRequest(message, ws));
  });

  ws.on("close", (code, reason) => {
    RemoveClient(ws);
    console.log("Connection closed");
  });
});
