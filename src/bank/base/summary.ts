export class Summary {
    constructor(private pendingAmount, private availableAmount) {
    }

    public getPendingAmount(): number {
        return this.pendingAmount;
    }

    public getAvailableAmount(): number {
        return this.availableAmount;
    }
}
