import * as cheerio from "cheerio";
import {Config} from "../../../config";
import {Summary} from "../../base/summary";

export function extractSummary(config: Config, accountOverviewHtml: string): Summary {
    const $ = cheerio.load(accountOverviewHtml);

    type AccountAndAmount = { accountNr: string, availableAmount: number };
    const accounts: AccountAndAmount[] = [];

    $("li", "#accounts-list").each((i, liElement) => {
        const accountNr = $(liElement).find(".ui-block-a").find("p.text-secondary").text();
        const availableAmountText = $(liElement).find(".ui-block-b").text();
        const availableAmount = parseNumber(availableAmountText);

        accounts.push({accountNr, availableAmount});
    });

    const expectedAccountNr = config.get("bank.swedbank.accountNr");
    const theAccount = accounts.find((anAccount) => anAccount.accountNr.includes(expectedAccountNr));

    const pendingAmount = 0;
    return new Summary(pendingAmount, theAccount.availableAmount);
}

function parseNumber(numberAsString): number {
    return parseFloat(numberAsString.trim().replace(/[\s]+/, ""));
}
