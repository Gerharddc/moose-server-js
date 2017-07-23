import * as express from "express";
import * as storage from "node-persist";
import { Notify } from "./notify";

// Get the storage ready before we start the application
storage.initSync();

const app = express();

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

import { HandleRequest } from "./handlers";
import { AddClient, RemoveClient } from "./notify";

import { Server as WebSocketServer} from "ws";
const wss = new WebSocketServer({ port: 8080 });
console.log("Started websocket server");

wss.on("connection", (ws) => {
  AddClient(ws);
  console.log("New connection");

  ws.on("message", async (message) => {
    console.log("message: " + message);

    ws.send(await HandleRequest(String(message), ws));
  });

  ws.on("close", (code, reason) => {
    RemoveClient(ws);
    console.log("Connection closed");
  });
});

import * as Files from "./files";
import * as Serial from "./serial";
Files.Init();
Serial.Init();
