import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {ITransaction, IWallet} from "./responseTypes";

export class RevolutTransactionData {
    private transactionsResponse: ITransaction[];
    private walletResponse: IWallet;
    private transactions: TransactionRow[];
    private summary: Summary;

    constructor(transactionsResponse: ITransaction[], walletResponse: IWallet) {
        this.transactionsResponse = transactionsResponse;
        this.walletResponse = walletResponse;
    }

    public async init(): Promise<RevolutTransactionData> {
        this.transactions = await this.extractTransactions();
        this.summary = this.extractSummary();
        return this;
    }

    public getTransactions() {
        return this.transactions;
    }

    public getSummary() {
        return this.summary;
    }

    private async extractTransactions() {
        const transactions = this.transactionsResponse
            .filter((t: ITransaction) => t.currency === "EUR")
            .filter((t: ITransaction) => t.state === "COMPLETED" || t.state === "PENDING")
            .sort((t1: ITransaction, t2: ITransaction) => t1.startedDate - t2.startedDate);

        return transactions.map((t: ITransaction) => {
            const date = new Date(t.startedDate);
            const amount = (t.amount - t.fee) / 100.0;

            const payerOrPayee = getPayerOrPayee(t);
            const comment = getDescription(t);
            const completed = t.state !== "PENDING";

            return new TransactionRow(date, amount, payerOrPayee, comment, completed);
        });
    }

    private extractSummary() {
        const pockets = this.walletResponse.pockets
            .filter((pocket) => pocket.currency === "EUR")
            .filter((pocket) => pocket.state === "ACTIVE");

        const firstPocket = pockets[0];

        const balance = firstPocket.balance / 100.0;
        const blockedAmount = firstPocket.blockedAmount / 100.0;

        return new Summary(blockedAmount, balance);
    }
}

function getPayerOrPayee(transaction: ITransaction): string {
    if (transaction.type === "TRANSFER") {
        if (transaction.sender) {
            return `${transaction.sender.firstName} ${transaction.sender.lastName}`;
        }
        if (transaction.recipient) {
            return `${transaction.recipient.firstName} ${transaction.recipient.lastName}`;
        }
    }
    if (transaction.type === "CARD_PAYMENT") {
        return `${transaction.merchant.name}, ${transaction.merchant.city}, ${transaction.merchant.country}`;
    }
    if (transaction.type === "ATM") {
        return `Cash at ${transaction.merchant.name}, ${transaction.merchant.city}, ${transaction.merchant.country}`;
    }

    return transaction.description;
}

function getDescription(transaction: ITransaction): string {
    if (transaction.type === "TRANSFER") {
        if (transaction.comment) {
            return transaction.comment;
        }
    }
    return transaction.description;
}
