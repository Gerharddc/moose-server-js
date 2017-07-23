import * as cors from "cors";
import * as express from "express";
import * as multer from "multer";
import { processFile, rawPath } from "./files";
import { Notify } from "./notify";

const upload = multer({dest: rawPath});

const app = express();
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

app.post("/upload", upload.single("gcode"), async (req, res, next) => {
  console.log("Upload: " + req.file.filename);
  await processFile(req.file);
  Notify("Printer", 0, "Files", null);
});

app.post("/uploads", upload.array("gcodes"), async (req, res, next) => {
  if (req.files instanceof Array) {
    for (const file of req.files) {
      console.log("Upload: " + file.filename);
      await processFile(file);
      Notify("Printer", 0, "Files", null);
    }
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

  ws.on("message", async (message) => {
    console.log("message: " + message);

    ws.send(await HandleRequest(message, ws));
  });

  ws.on("close", (code, reason) => {
    RemoveClient(ws);
    console.log("Connection closed");
  });
});
