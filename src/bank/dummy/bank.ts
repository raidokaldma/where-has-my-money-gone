import * as moment from "moment";
import {withSpinner} from "../../common/promise-spinner";
import {sleep} from "../../common/util";
import {Bank} from "../base/bank";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";

export class DummyBank extends Bank {
    public static Name = "Dummy";

    public getName(): string {
        return DummyBank.Name;
    }

    public async fetchData(): Promise<void> {
        for (let i = 1; i <= 5; i++) {
            await withSpinner(sleep(500), `Progress Step ${i}`);
        }
    }

    public getTransactions(): TransactionRow[] {
        return [
            new TransactionRow(moment().subtract(7, "days").toDate(), -12, "Some Guy", "Das Ist Description", false),
            new TransactionRow(moment().subtract(4, "days").toDate(), -929.229, "Some Guy", "Das Ist Description"),
            new TransactionRow(moment().subtract(3, "days").toDate(), 123.45, null, "Das Ist Description"),
            new TransactionRow(moment().toDate(), .02, "Some Guy", null),
        ];
    }

    public getSummary(): Summary {
        return new Summary(123.45, 22.3);
    }
}
