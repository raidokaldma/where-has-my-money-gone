import * as readline from "readline";

export async function readUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });

        // Handle CTRL+C
        rl.on("SIGINT", () => {
            reject(new Error("User aborted"));
            rl.close();
        });
    });
}
