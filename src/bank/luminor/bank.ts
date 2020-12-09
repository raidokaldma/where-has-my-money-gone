import {Config} from "../../config";
import {Bank} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {fetchTransactionsAndSummary} from "./luminorDataFetcher";

export class LuminorBank implements Bank {
    public static Name = "Luminor";

    private summary: Summary;
    private transactions: TransactionRow[];

    constructor(private config: Config) {
    }

    public getName(): string {
        return LuminorBank.Name;
    }

    public async fetchData() {
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
