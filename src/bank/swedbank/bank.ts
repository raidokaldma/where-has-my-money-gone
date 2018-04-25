import {Config} from "../../config";
import {Bank} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {SwedbankDataFetcher} from "./swedbankDataFetcher";
import {SwedbankTransactionData} from "./swedbankTransactionData";

export class Swedbank extends Bank {
    public static Name = "Swedbank";

    private config: Config;
    private transactionData: SwedbankTransactionData;

    constructor(config) {
        super();
        this.config = config;
    }

    public getName(): string {
        return Swedbank.Name;
    }

    public async fetchData(): Promise<void> {
        const dataFetcher = new SwedbankDataFetcher(this.config);
        this.transactionData = await dataFetcher.fetch();
    }

    public getTransactions(): TransactionRow[] {
        return this.transactionData.getTransactions();
    }

    public getSummary(): Summary {
        return this.transactionData.getSummary();
    }
}
