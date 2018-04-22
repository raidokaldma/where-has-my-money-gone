export function sleep(timeInMs) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs);
    });
}
