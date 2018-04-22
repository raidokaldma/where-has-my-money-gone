export class Summary {
    private pendingAmount: number;
    private availableAmount: number;

    constructor(pendingAmount, availableAmount) {
        this.pendingAmount = pendingAmount;
        this.availableAmount = availableAmount;
    }

    public getPendingAmount(): number {
        return this.pendingAmount;
    }

    public getAvailableAmount(): number {
        return this.availableAmount;
    }
}
