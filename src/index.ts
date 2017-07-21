import * as cors from "cors";
import * as express from "express";
import * as fileUpload from "express-fileupload";
import { saveUploadedFile } from "./files";

const app = express();
app.use(fileUpload());
app.use(cors());

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
  console.log("upload request");

  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  try {
    const gcodes = req.files.gcodes;

    if (Array.isArray(gcodes)) {
      gcodes.forEach((gcode) => saveUploadedFile(gcode));
    } else {
      saveUploadedFile(gcodes);
    }

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

