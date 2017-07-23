import * as fs from "async-file";
import * as child_process from "child_process";
import { Notify, NotifyError } from "./notify";

export const rootPath = "/home/printer/";
export const readyPath = rootPath + "ready/";
export const rawPath = rootPath + "raw/";
export const metadataPath = rootPath + "metadata/";

const workerProcess = child_process.fork(__dirname + "/fileWorker.js");
workerProcess.on("message", (msg) => {
    switch (msg.type) {
        case "error":
            NotifyError(msg.error);
            break;
    }
});

export async function listFiles(): Promise<string[]> {
    const files: string[] = [];
    (await fs.readdir(rootPath)).forEach((file) => {
        files.push(file);
    });

    return files;
}

export async function processFile(file: Express.Multer.File) {
    const oldPath = rootPath + file.filename;
    let newPath = rootPath + file.originalname;

    let n = 1;
    while (await fs.exists(newPath)) {
        n++;
        const parsed = path.parse(file.originalname);
        newPath = `${rootPath}${parsed.name}(${n})${parsed.ext}`;
    }

    await fs.rename(oldPath, newPath);
}

export async function deleteFile(file: string) {
    // TODO: secure
    try {
        await fs.unlink(rootPath + file);

        console.log("Deleted file: " + file);
        Notify("Printer", 0, "Files", null);
    } catch (err) {
        console.log("Error deleting file: " + err);
    }
}
