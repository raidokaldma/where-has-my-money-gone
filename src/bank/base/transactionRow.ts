export class TransactionRow {
    constructor(private date: Date,
                private amount: number,
                private payerOrPayee: string,
                private description: string,
                private completed: boolean = true) {
    }

    public getDate() {
        return this.date;
    }

    public getAmount() {
        return this.amount;
    }

    public getPayerOrPayee() {
        return this.payerOrPayee;
    }

    public getDescription() {
        return this.description;
    }

    public isCompleted() {
        return this.completed;
    }

    public static sortByDate = ((t1: TransactionRow, t2: TransactionRow) => t1.getDate().valueOf() - t2.getDate().valueOf());
}
