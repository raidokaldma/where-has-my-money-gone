import {Config} from "../../config";
import {Bank} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {fetchTransactionsAndSummary} from "./swedbankDataFetcher";

export class Swedbank implements Bank {
    public static Name = "Swedbank";

    private summary: Summary;
    private transactions: TransactionRow[];

    constructor(private config: Config) {
    }

    public getName(): string {
        return Swedbank.Name;
    }

    public async fetchData(): Promise<void> {
        const {summary, transactions} = await fetchTransactionsAndSummary(this.config);
        this.summary = summary;
        this.transactions = transactions;
    }

    public getTransactions(): TransactionRow[] {
        return this.transactions;
    }

    public getSummary(): Summary {
        return this.summary;
    }
}
