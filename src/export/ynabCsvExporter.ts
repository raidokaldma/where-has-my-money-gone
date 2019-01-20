import * as csvStringify from "csv-stringify";
import {promisify} from "es6-promisify";
import * as fs from "fs";
import * as moment from "moment";
import * as path from "path";
import {Bank} from "../bank/base/bank";
import {TransactionRow} from "../bank/base/transactionRow";
import {Config} from "../config";
import {IBankDataExporter} from "./baseDataExporter";

const asyncCsvStringify: (input: Array<{}>, opts: csvStringify.Options) => Promise<any> = promisify(csvStringify);
const asyncWriteFile: (path: fs.PathLike, data: any) => Promise<any> = promisify(fs.writeFile);

export class YnabCsvExporter implements IBankDataExporter {
    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    public async export(bank: Bank): Promise<void> {
        const transactions = bank.getTransactions();
        const csv = await this.toCsv(transactions);

        const fileName = `ynab-${bank.getName().toLowerCase()}.csv`;
        const outputFileName = path.join(this.config.get("exporter.ynab.csv.outDirectory"), fileName);

        await asyncWriteFile(outputFileName, csv);
    }

    private async toCsv(transactions: TransactionRow[]) {
        const csvAsObject = transactions.map((transactionRow) => {
            const amount = transactionRow.getAmount();
            return {
                Date: moment(transactionRow.getDate()).format("DD/MM/YYYY"),
                Category: "",
                Payee: transactionRow.getPayerOrPayee(),
                Memo: transactionRow.getDescription(),
                Inflow: amount <= 0 ? "" : amount,
                Outflow: amount <= 0 ? -amount : "",
            };
        });

        return asyncCsvStringify(csvAsObject, {header: true});
    }
}
