export class Summary {
    constructor(private pendingAmount: number, private availableAmount: number) {
    }

    public getPendingAmount(): number {
        return this.pendingAmount;
    }

    public getAvailableAmount(): number {
        return this.availableAmount;
    }
}
