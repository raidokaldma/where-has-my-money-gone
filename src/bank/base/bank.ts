import {Summary} from "./summary";
import {TransactionRow} from "./transactionRow";

export abstract class Bank {
    public abstract getName(): string;

    public abstract async fetchData(): Promise<void>;

    public abstract getTransactions(): TransactionRow[];

    public abstract getSummary(): Summary;
}
