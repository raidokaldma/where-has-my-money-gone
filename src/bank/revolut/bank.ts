import {Config} from "../../config";
import {Bank, ProgressMessageCallback} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {RevolutDataFetcher} from "./revolutDataFetcher";
import {RevolutTransactionData} from "./revolutTransactionData";

export class RevolutBank extends Bank {
    public static Name = "Revolut";

    private config: Config;
    private transactionData: RevolutTransactionData;

    constructor(config: Config) {
        super();
        this.config = config;
    }

    public getName(): string {
        return RevolutBank.Name;
    }

    public async fetchData(sendProgress: ProgressMessageCallback): Promise<void> {
        sendProgress("Sending requests");
        const dataFetcher = new RevolutDataFetcher(this.config);
        this.transactionData = await dataFetcher.fetch();
        sendProgress("Done");
    }

    public getTransactions(): TransactionRow[] {
        return this.transactionData.getTransactions();
    }

    public getSummary(): Summary {
        return this.transactionData.getSummary();
    }
}
