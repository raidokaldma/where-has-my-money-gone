import {Spinner} from "cli-spinner";

export async function withSpinner<T>(dasPromise: Promise<T>, message: string): Promise<T> {
    const spinner = new Spinner(message);
    spinner.setSpinnerString("⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆");
    spinner.start();

    try {
        const returnValue: T = await dasPromise;
        spinner.stop(true);
        console.log(`✅ ${message}`);
        return returnValue;
    } catch (error) {
        spinner.stop(true);
        console.error(`❌ ${message}`);
        throw error;
    }
}
