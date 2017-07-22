import * as fs from "async-file";
import * as path from "path";
import { Notify } from "./notify";

export const rootPath = "/home/printer/";

export async function listFiles(): Promise<string[]> {
    const files: string[] = [];
    (await fs.readdir(rootPath)).forEach((file) => {
        files.push(file);
    });

    return files;
}

export async function nameFile(file: Express.Multer.File) {
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
