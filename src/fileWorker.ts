import * as fs from "async-file";
import * as gcode from "gcode";
import * as path from "path";
import * as Files from "./files";

process.on("message", (msg) => {
    switch (msg.action) {
        case "processFile":
            processFile(msg.file);
            break;
    }
});

const LastPoses = {
    X: 0,
    Y: 0,
    Z: 0,
};

const LastsFs = {
    0: 0,
    1: 0,
};

async function processFile(file: Express.Multer.File) {
    // Determine the final name
    const oldPath = Files.rawPath + file.filename;
    let newPath = Files.readyPath + file.originalname;
    const parsed = path.parse(file.originalname);

    let n = 1;
    while (await fs.exists(newPath)) {
        n++;
        newPath = `${Files.readyPath}${parsed.name}(${n})${parsed.ext}`;
    }



    await fs.rename(oldPath, newPath);
}
