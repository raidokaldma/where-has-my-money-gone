import {Config} from "../../config";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {getTransactionsFromCsv} from "./parser/accountStatementCsvParser";
import {getAccountSummaryFromHtml} from "./parser/accountSummaryHtmlParser";
import {getReservedTransactionsFromHtml} from "./parser/reservedTransactionsHtmlParser";

export class NordeaTransactionData {
    private config: Config;
    private transactions: TransactionRow[];
    private summary: Summary;

    constructor(config: Config) {
        this.config = config;
    }

    public async init(accountSummaryHtml: string, accountStatementCsv: string, reservationsHtml: string) {
        this.transactions = await this.extractTransactions(accountStatementCsv, reservationsHtml);
        this.summary = this.extractSummary(accountSummaryHtml);
        return this;
    }

    public getTransactions(): TransactionRow[] {
        return this.transactions;
    }

    public getSummary(): Summary {
        return this.summary;
    }

    private async extractTransactions(accountStatementCsv: string, reservationsHtml: string): Promise<TransactionRow[]> {
        const transactions: TransactionRow[] = await getTransactionsFromCsv(accountStatementCsv);
        const reservedTransactions: TransactionRow[] = getReservedTransactionsFromHtml(reservationsHtml);
        const allTransactions = [...transactions, ...reservedTransactions];

        return allTransactions.sort(TransactionRow.sortByDate);
    }

    private extractSummary(accountSummaryHtml: string) {
        return getAccountSummaryFromHtml(this.config, accountSummaryHtml);
    }
}
