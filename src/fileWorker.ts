import * as fs from "async-file";
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
const GCoder = require("../build/Release/gcoder");

/*function procFile(inFile: string, outFile: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const log = (val: number) => {
            console.log("Progress: " + val);
        };

        GCoder.TimeFile(inFile, outFile, log, (time: number) => resolve(time));
    });
}*/

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

    const log = (val: number) => {
        console.log("Progress: " + val);
    };

    const time = GCoder.TimeFile(oldPath, newPath, log);

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
    console.log("Upload: " + req.file.filename);
    await processFile(req.file);
    res.write("ok");
    notifyFiles();
});

app.post("/uploads", upload.array("gcodes"), async (req, res, next) => {
    if (req.files instanceof Array) {
        for (const file of req.files) {
            console.log("Upload: " + file.filename);
            await processFile(file);
        }

        notifyFiles();
    }

    res.write("ok");
});
