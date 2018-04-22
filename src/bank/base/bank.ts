import {Summary} from "./summary";
import {TransactionRow} from "./transactionRow";

export type ProgressMessageCallback = (message: string) => void;

export abstract class Bank {
    public abstract getName(): string;

    public abstract async fetchData(progressCallback: ProgressMessageCallback): Promise<void>;

    public abstract getTransactions(): TransactionRow[];

    public abstract getSummary(): Summary;
}
