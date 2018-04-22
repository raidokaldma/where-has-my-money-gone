import * as cheerio from "cheerio";
import {Config} from "../../../config";
import {Summary} from "../../base/summary";

export function getAccountSummaryFromHtml(config: Config, accountSummaryHtml): Summary {
    const accountName = config.get("bank.nordea.accountName");

    const $ = cheerio.load(accountSummaryHtml);

    const tr = $("tbody", ".tgrid1")
        .find("tr")
        .filter((index, element) => $(element).text().includes(accountName));

    if (tr.length !== 1) {
        throw new Error(`😱 Could not find account with name "${accountName}"`);
    }

    // Columns per row:
    // <td>Account name</td>
    // <td>Currency</td>
    // <td>Balance</td>
    // <td>Funds available</td>
    // <td>Reserved</td>
    // <td>Last transaction</td>
    const availableAmountAsText = $($("td", tr).get(3)).text();
    const reservedAmountAsText = $($("td", tr).get(4)).text();

    const availableAmount = parseNumberFromHtml(availableAmountAsText);
    const reservedAmount = parseNumberFromHtml(reservedAmountAsText);

    return new Summary(reservedAmount, availableAmount);
}

function parseNumberFromHtml(text) {
    // Decimal separator = ".", thousands separator = ","
    return parseFloat(text.trim().replace(",", ""));
}
