import * as fs from "async-file";
import * as child_process from "child_process";
import * as storage from "node-persist";
import { Notify, NotifyError } from "./notify";

export const rootPath = "/home/printer/";
export const readyPath = rootPath + "ready/";
export const rawPath = rootPath + "raw/";

const workerProcess = child_process.fork(__dirname + "/fileWorker.js");
workerProcess.on("message", async (msg) => {
    switch (msg.type) {
        case "setFileTime":
            await setFileTime(msg.file, msg.time);
            break;
        case "error":
            NotifyError(msg.error);
            break;
    }
});

async function setFileTime(file: string, time: number) {
    await storage.setItem("FileTime-" + file, time);
}

export async function getFileTime(file: string): Promise<number> {
    return await storage.getItem("FileTime-" + file);
}

export async function listFiles(): Promise<string[]> {
    const files: string[] = [];
    (await fs.readdir(rootPath)).forEach((file) => {
        files.push(file);
    });

    return files;
}

export function processFile(file: Express.Multer.File) {
    workerProcess.send({
        action: "processFile",
        file,
    });
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
