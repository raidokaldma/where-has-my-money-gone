import {Config} from "../../config";
import {Bank} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {NordeaDataFetcher} from "./nordeaDataFetcher";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaBank implements Bank {
    public static Name = "Nordea";

    private transactionData: NordeaTransactionData;

    constructor(private config: Config) {
    }

    public getName(): string {
        return NordeaBank.Name;
    }

    public async fetchData(): Promise<void> {
        const dataFetcher = new NordeaDataFetcher(this.config);
        this.transactionData = await dataFetcher.fetch();
    }

    public getTransactions(): TransactionRow[] {
        return this.transactionData.getTransactions();
    }

    public getSummary(): Summary {
        return this.transactionData.getSummary();
    }
}
