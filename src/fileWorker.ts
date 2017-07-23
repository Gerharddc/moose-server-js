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

function procLines(file: string, output: fs.WriteStream): Promise<number> {
    return new Promise((resolve, reject) => {
        console.log("Processing: " + file);

        const lineReader = new LineByLineReader(file);

        const LastPoses: { [index: string]: number } = {
            X: 0,
            Y: 0,
            Z: 0,
        };

        const LastsFs = {
            0: 0,
            1: 0,
        };

        let fileTime = 0;
        let goingRelative = false;

        lineReader.on("line", (line) => {
            // Remove comments
            line = line.split(";")[0];

            const parts = line.split(" ");
            const blocks: Map<string, string> = new Map();

            for (const part of parts) {
                blocks.set(part[0], part.slice(1));
            }

            let time = 0;

            if (blocks.has("G")) {
                const g = Number.parseInt(blocks.get("G")!);

                if (g === 0 || g === 1) {
                    if (blocks.has("F")) {
                        // Convert mm/min to mm/msec
                        LastsFs[g] = Number.parseFloat(blocks.get("F")!) / 60000;
                    }

                    const feedrate = LastsFs[g];

                    let dist = 0;
                    for (const key in LastPoses) {
                        if (blocks.has(key)) {
                            const now = Number.parseFloat(blocks.get(key)!);

                            if (goingRelative) {
                                dist += Math.pow(now, 2);
                                LastPoses[key] += now;
                            } else {
                                dist += Math.pow(now - LastPoses[key], 2);
                                LastPoses[key] = now;
                            }
                        }
                    }
                    dist = Math.sqrt(dist);

                    // Calculate the time in milliseconds
                    time = (dist / LastsFs[g]) * 1.1; // add 10%
                    fileTime += time;
                } else if (g === 90) {
                    goingRelative = false;
                } else if (g === 91) {
                    goingRelative = true;
                }
            }

            // We need to encode the map as an array
            output.write(JSON.stringify({ blocks: [...blocks], time }) + "\n");
        });

        lineReader.on("error", (err) => {
            console.log("Linereader: " + err);
            reject(err);
        });

        lineReader.on("end", () => {
            resolve(fileTime);
        });
    });
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

    const writer = fs.createWriteStream(newPath, { flags: "w" });
    const time = await procLines(oldPath, writer);
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
