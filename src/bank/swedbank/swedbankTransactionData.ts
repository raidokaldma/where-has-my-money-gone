import * as moment from "moment";
import {RequestAPI, RequiredUriUrl} from "request";
import {TextDecoder} from "text-encoding";
import {Config} from "../../config";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";
import {extractSummary} from "./parser/accountOverviewHtmlParser";
import {extractTransactions} from "./parser/transactionsHtmlParser";

export class SwedbankTransactionData {
    private config: Config;

    private transactions: TransactionRow[];
    private summary: Summary;

    constructor(config: Config) {
        this.config = config;
    }

    public async init(accountOverviewHtml: string, transactionsHtml: string): Promise<SwedbankTransactionData> {
        this.transactions = extractTransactions(transactionsHtml);
        this.summary = extractSummary(this.config, accountOverviewHtml);
        return this;
    }

    public getTransactions(): TransactionRow[] {
        const afterDate = moment().subtract(1, "month").toDate();

        const transactions = this.transactions.filter((transaction: TransactionRow) => {
            // Swedbank API has no `afterDate` query parameter, so old transactions must be filtered out here.
            return transaction.getAmount() && (transaction.getDate() > afterDate);
        });

        return transactions.sort(TransactionRow.sortByDate);
    }

    public getSummary(): Summary {
        return this.summary;
    }
}
