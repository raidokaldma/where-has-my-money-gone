import {Config} from "../../config";
import {Bank, ProgressMessageCallback} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {NordeaDataFetcher} from "./nordeaDataFetcher";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaBank extends Bank {
    public static Name = "Nordea";

    private config: Config;
    private transactionData: NordeaTransactionData;

    constructor(config) {
        super();
        this.config = config;
    }

    public getName(): string {
        return NordeaBank.Name;
    }

    public async fetchData(progressMessageCallback: ProgressMessageCallback): Promise<void> {
        const dataFetcher = new NordeaDataFetcher(this.config, progressMessageCallback);
        this.transactionData = await dataFetcher.fetch();
    }

    public getTransactions(): TransactionRow[] {
        return this.transactionData.getTransactions();
    }

    public getSummary(): Summary {
        return this.transactionData.getSummary();
    }
}
