import * as cheerio from "cheerio";
import * as moment from "moment";
import {TransactionRow} from "../../base/transactionRow";

const DateFormat = "DD.MM.YYYY HH:mm:ss";

export function getReservedTransactionsFromHtml(reservationsHtml: string) {

    const $ = cheerio.load(reservationsHtml);

    // .tgrid1 > tbody > tr[]
    const trElements = $("tbody", ".tgrid1").find("tr");

    const reservedTransactions = [];
    trElements.each((index, trElement) => {
        // Table row contains four columns: 0 Date, 1 Amount, 2 empty, 3 Details

        const dateAsText = $($("td", trElement).get(0)).text();
        const amountAsText = $($("td", trElement).get(1)).text();
        const fullDescription = $($("td", trElement).get(3)).text();

        const transactionRow = getTransactionRow(dateAsText, amountAsText, fullDescription);
        reservedTransactions.push(transactionRow);
    });
    return reservedTransactions;
}

function getTransactionRow(dateAsText: string, amountAsText: string, fullDescription: string) {
    const date = toDate(dateAsText);
    const amount = -toNumber(amountAsText);
    const {description, name} = getDescriptionAndName(fullDescription);

    return new TransactionRow(date, amount, name, description, false);
}

function toDate(dateAsText) {
    return moment(dateAsText, DateFormat).toDate();
}

function toNumber(numberAsText) {
    // Thousands separator: ","
    return parseFloat(numberAsText.trim().replace(",", ""));
}

function getDescriptionAndName(fullDescription) {
    const cleanedUpDescription = fullDescription
        .trim()
        .replace("POS transaction ", "");

    const twoPartMatch = /(.+)\s>(.+)/.exec(cleanedUpDescription);
    if (twoPartMatch) {
        return {
            description: twoPartMatch[1],
            name: twoPartMatch[2],
        };
    }

    return {
        description: cleanedUpDescription,
        name: "",
    };
}
