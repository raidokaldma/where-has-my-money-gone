import {DummyBank} from "./bank/dummy/bank";
import {NordeaBank} from "./bank/nordea/bank";
import {RevolutBank} from "./bank/revolut/bank";
import {Swedbank} from "./bank/swedbank/bank";
import {Config} from "./config";
import {ConsoleExporter} from "./export/consoleExporter";
import {YnabApiExporter} from "./export/ynabApiExporter";
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
    new YnabApiExporter(config),
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
    const bank = banks.get(bankName);
    await bank.fetchData();
    for (const exporter of bankDataExporters) {
        await exporter.export(bank);
    }
}
