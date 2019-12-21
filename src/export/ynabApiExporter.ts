import * as moment from "moment";
import {Account, api as YnabApi, BulkResponse, ErrorResponse, SaveTransaction, utils} from "ynab";
import {Bank} from "../bank/base/bank";
import {TransactionRow} from "../bank/base/transactionRow";
import {withSpinner} from "../common/promise-spinner";
import {Config} from "../config";
import {IBankDataExporter} from "./baseDataExporter";

const MAX_PAYEE_NAME_LENGTH = 50;

export class YnabApiExporter implements IBankDataExporter {
    private config: Config;
    private ynabApi: YnabApi;
    private readonly budgetId: string;

    constructor(config: Config) {
        this.config = config;
        this.ynabApi = new YnabApi(this.config.get("exporter.ynab.api.key"));
        this.budgetId = this.config.get("exporter.ynab.api.budgetId");
    }

    public async export(bankData: Bank): Promise<void> {
        const bankName = bankData.getName().toLowerCase();
        const accountId = this.config.get(`exporter.ynab.api.account.${bankName}`);

        if (!accountId) {
            console.log("😮 Skipping YNAB API export, could not find accountId from config");
            return;
        }
        const ynabAmount = await withSpinner(
            this.getYnabAccountBalance(accountId),
            "Fetching account balance from YNAB",
        );

        const bankAmount = bankData.getSummary().getAvailableAmount();

        if (bankAmount === ynabAmount) {
            console.log("✅ YNAB is up to date");
            console.log();
            return;
        }

        const transactions = bankData.getTransactions();

        const updateCount = await withSpinner(
            this.bulkCreateYnabTransactions(accountId, transactions),
            "Sending transactions to YNAB",
        );

        console.log(`✅ Done. Added ${updateCount} new transactions.`);
        console.log();
    }

    private async getYnabAccountBalance(accountId: string) {
        const accountResponse = await this.ynabApi.accounts.getAccountById(this.budgetId, accountId);
        const account: Account = accountResponse.data.account;
        const ynabAmount = utils.convertMilliUnitsToCurrencyAmount(account.balance);
        return ynabAmount;
    }

    private toYnabTransactions(transactions: TransactionRow[], accountId: string) {
        const importIdGenerator = new ImportIdGenerator();

        return transactions.map((transaction: TransactionRow) => {
            const importId = importIdGenerator.generateId(transaction.getDate(), transaction.getAmount());
            const milliamount = toMilliUnits(transaction.getAmount());

            // Some banks might provide future dates for pending transactions, but YNAB API does not accept future dates.
            const isoDate = formatDate(transaction.getDate() < new Date() ? transaction.getDate() : new Date());

            const description = toLimitedMemo(transaction.getDescription());
            const name = (transaction.getPayerOrPayee() || "").trim().substring(0, MAX_PAYEE_NAME_LENGTH);

            const ynabTransaction: SaveTransaction = {
                import_id: importId,
                account_id: accountId,
                date: isoDate,
                amount: milliamount,
                payee_name: name,
                memo: description,
                cleared: SaveTransaction.ClearedEnum.Cleared,
                flag_color: SaveTransaction.FlagColorEnum.Orange,
            };
            return ynabTransaction;
        });
    }

    private async bulkCreateYnabTransactions(accountId: string, transactions: TransactionRow[]) {
        const ynabTransactions = this.toYnabTransactions(transactions, accountId);

        try {
            const response: BulkResponse = await this.ynabApi.transactions.bulkCreateTransactions(this.budgetId, {transactions: ynabTransactions});
            const updateCount = response.data.bulk.transaction_ids.length;
            return updateCount;
        } catch (error) {
            throw new Error((error as ErrorResponse).error.detail);
        }
    }
}

class ImportIdGenerator {
    private occurrenceCountMap = new Map<string, number>();

    public generateId(date, amount): string {
        const milliamount = toMilliUnits(amount);
        const dateString = formatDate(date);
        const partialImportId = `YNAB:${milliamount}:${dateString}`;

        this.occurrenceCountMap.set(partialImportId, this.occurrenceCountMap.get(partialImportId) + 1 || 1);
        const occurrenceCount = this.occurrenceCountMap.get(partialImportId);

        // YNAB API documentation - import_id will have the format: 'YNAB:[milliunit_amount]:[iso_date]:[occurrence]'
        return `${partialImportId}:${occurrenceCount}`;
    }
}

function toMilliUnits(amount) {
    return Math.round(amount * 1000);
}

function formatDate(date) {
    return moment(date).format("YYYY-MM-DD");
}

function toLimitedMemo(description) {
    return (description || "").substring(0, 100);
}
