import * as cheerio from "cheerio";
import * as moment from "moment";
import {TransactionRow} from "../../base/transactionRow";

export function extractTransactions(transactionsHtml: string): TransactionRow[] {
    const $ = cheerio.load(transactionsHtml);
    const transactions: TransactionRow[] = [];

    $("li", "#account-transactions-list")
        .filter(":has(.ui-grid-a)") // Filter out rows without transaction data (first row and last row for example)
        .filter((i, el) => $(el).find(".ui-block-b").text().trim().endsWith("EUR")) // Only include EUR currency
        .each((i, liElement) => {
            const dateAsString = $(liElement).find(".ui-block-a").text();
            const amountString = $(liElement).find(".ui-block-b").text();

            const date = parseDate(dateAsString);
            const amount = parseNumber(amountString);
            const name = $(liElement).find("h3").not(".ui-block-b").text().trim() || "Swedbank";
            const description = $(liElement).find("p.text-secondary").text();

            transactions.push(new TransactionRow(date, amount, name, description));
        });

    return transactions;
}

function parseNumber(numberAsString): number {
    return parseFloat(numberAsString.trim().replace(/[\s]+/, ""));
}

function parseDate(dateAsString): Date {
    return moment(dateAsString, "DD.MM.YYYY").toDate();
}
