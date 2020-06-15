import * as chalk from "chalk";
import * as Table from "cli-table";
import * as moment from "moment";
import {Bank} from "../bank/base/bank";
import {Summary} from "../bank/base/summary";
import {TransactionRow} from "../bank/base/transactionRow";
import {IBankDataExporter} from "./baseDataExporter";

export class ConsoleExporter implements IBankDataExporter {
    public async export(bankData: Bank) {
        const transactions = bankData.getTransactions();
        const summary = bankData.getSummary();

        this.printBankName(bankData);
        this.printTransactions(transactions);
        this.printSummary(summary);
    }

    private printBankName(bankData: Bank) {
        const summaryTable = new Table({
            style: {
                head: ["cyan"],
            },
        });

        summaryTable.push({Bank: bankData.getName()});

        console.log(summaryTable.toString());
    }

    private printTransactions(transactions: TransactionRow[]) {
        const tableHeaders = ["Date", "Amount", "Payer/Payee", "Description"];
        const tableRows = transactions.map((transactionRow) => {
            const amount = transactionRow.getAmount();

            let formattedAmount = amount.toFixed(2);
            formattedAmount = amount < 0 ? chalk.red(formattedAmount) : chalk.green(formattedAmount);
            formattedAmount = transactionRow.isCompleted() ? formattedAmount : chalk.dim(formattedAmount);

            return [
                moment(transactionRow.getDate()).format("YYYY.MM.DD ddd"),
                formattedAmount,
                transactionRow.getPayerOrPayee() || "",
                transactionRow.getDescription() || "",
            ];
        });

        const table = new Table({
            colAligns: [null, "right", null, null],
            head: tableHeaders,
            style: {
                compact: true, head: ["cyan"],
            },
        });

        table.push(...tableRows);
        console.log(table.toString());
    }

    private printSummary(summary: Summary) {
        const summaryTable = new Table({
            colAligns: [null, "right"],
            style: {
                compact: true, head: ["cyan"],
            },
        });

        summaryTable.push({"Pending Amount": chalk.dim(summary.getPendingAmount().toFixed(2))});
        summaryTable.push({"Available Amount": summary.getAvailableAmount().toFixed(2)});

        console.log(summaryTable.toString());
    }
}
