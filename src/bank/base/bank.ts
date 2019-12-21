import {Summary} from "./summary";
import {TransactionRow} from "./transactionRow";

export interface Bank {
    getName(): string;
    fetchData(): Promise<void>;
    getTransactions(): TransactionRow[];
    getSummary(): Summary;
}
