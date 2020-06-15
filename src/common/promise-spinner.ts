import * as chalk from "chalk";
import {Spinner} from "cli-spinner";
import {performance} from "perf_hooks";

export async function withSpinner<T>(dasPromise: Promise<T>, message: string): Promise<T> {
    const startTime = performance.now();
    const spinner = new Spinner(message);
    spinner.setSpinnerString("⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆");
    spinner.start();

    try {
        const returnValue: T = await dasPromise;
        spinner.stop(true);
        logMessageWithTime(`✅ ${message}`, startTime);
        return returnValue;
    } catch (error) {
        spinner.stop(true);
        logMessageWithTime(`❌ ${message}`, startTime);
        throw error;
    }
}

function logMessageWithTime(message, startTime) {
    const endTime = performance.now();
    const timeTakenSec = (endTime - startTime) / 1000;
    const formattedTime = chalk.yellow(`(${timeTakenSec.toFixed(1)}s)`);
    console.log(`${message} ${formattedTime}`);
}
