import {Spinner} from "cli-spinner";
import {DummyBank} from "./bank/dummy/bank";
import {NordeaBank} from "./bank/nordea/bank";
import {RevolutBank} from "./bank/revolut/bank";
import {Swedbank} from "./bank/swedbank/bank";
import {Config} from "./config";
import {ConsoleExporter} from "./export/consoleExporter";
import {YnabCsvExporter} from "./export/ynabCsvExporter";

const config = new Config();
const banks = new Map()
    .set(NordeaBank.Name.toLowerCase(), new NordeaBank(config))
    .set(RevolutBank.Name.toLowerCase(), new RevolutBank(config))
    .set(Swedbank.Name.toLowerCase(), new Swedbank(config))
    .set(DummyBank.Name.toLowerCase(), new DummyBank());

const bankDataExporters = [
    new ConsoleExporter(),
    new YnabCsvExporter(config),
];

export const ValidBankNames = Array.from(banks.keys());

export function isValidBankName(bankName: string): boolean {
    return banks.has(bankName);
}

export async function fetchAndExportMultiple(bankNames: string[]): Promise<void> {
    for (const bankName of bankNames) {
        await fetchAndExport(bankName);
    }
}

async function fetchAndExport(bankName) {
    const spinner = new Spinner();

    try {
        spinner.setSpinnerString("⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆");
        spinner.start();

        const bank = banks.get(bankName);
        await bank.fetchData((progressMessage) => {
            spinner.setSpinnerTitle(progressMessage);
        });

        spinner.stop(true);

        bankDataExporters.forEach((exporter) => exporter.export(bank));
    } finally {
        spinner.stop(true);
    }
}
