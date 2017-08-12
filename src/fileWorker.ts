import * as fs from "mz/fs";
import * as LineByLineReader from "line-by-line";
import * as path from "path";
import * as Files from "./files";

process.on("message", (msg) => {
    switch (msg.action) {
        case "processFile":
            processFile(msg.file);
            break;
    }
});

function reportError(error: string) {
    if (process.send) {
        process.send({
            error,
            type: "error",
        });
    }
}

function notifyFiles() {
    if (process.send) {
        process.send({
            type: "notifyFiles",
        });
    }
}

function setFileTime(file: string, time: number) {
    if (process.send) {
        process.send({
            file,
            time,
            type: "setFileTime",
        });
    }
}

// tslint:disable-next-line:no-var-requires
const GCoder = require("../build/Release/gcoder.node");

function setProcessing(processing: boolean) {
    if (process.send) {
        process.send({
            processing,
            type: "processing",
        });
    }
}

function setProcProg(procprog: number) {
    if (process.send) {
        process.send({
            procprog,
            type: "procProg",
        });
    }
}

async function processFile(file: Express.Multer.File) {
    // Determine the final name
    const oldPath = Files.rawPath + file.filename;
    const parsed = path.parse(file.originalname);
    let newPath = Files.readyPath + parsed.name;

    if (parsed.ext !== ".gcode") {
        reportError(file.originalname + " is not GCode");
        return;
    }

    let n = 1;
    while (await fs.exists(newPath)) {
        n++;
        newPath = `${Files.readyPath}${parsed.name}(${n})`;
    }

    const time = GCoder.TimeFile(oldPath, newPath, setProcProg);

    // const time = await procFile(oldPath, newPath);
    setFileTime((n === 1) ? (parsed.name) : `${parsed.name}(${n})`, time);

    await fs.unlink(oldPath);
    console.log("Filetime: " + time);
}

import * as cors from "cors";
import * as express from "express";
import * as multer from "multer";

const upload = multer({ dest: Files.rawPath });

const app = express();
app.use(cors());

try {
    app.listen(3000, () => {
        console.log("File server listening!");
    });
} catch (e) {
    console.log("Express-listen-error: e");
}

app.post("/upload", upload.single("gcode"), async (req, res, next) => {
    res.write("ok");

    console.log("Upload: " + req.file.filename);

    setProcessing(true);
    await processFile(req.file);
    setProcessing(false);
    notifyFiles();
});

app.post("/uploads", upload.array("gcodes"), async (req, res, next) => {
    res.write("ok");

    if (req.files instanceof Array) {
        setProcessing(true);
        for (const file of req.files) {
            console.log("Upload: " + file.filename);
            await processFile(file);
        }
        setProcessing(false);

        notifyFiles();
    }
});
