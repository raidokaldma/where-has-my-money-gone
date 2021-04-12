import * as moment from "moment";
import {launch, Page} from "puppeteer";
import {withSpinner} from "../../common/promise-spinner";
import {Config} from "../../config";
import {Summary} from "../base/summary";
import {TransactionRow} from "../base/transactionRow";

export async function fetchTransactionsAndSummary(config: Config): Promise<{ summary: Summary, transactions: TransactionRow[] }> {
    const browser = await launch();
    try {
        const page = await browser.newPage();
        await page.setViewport({width: 1200, height: 800});
        await page.goto("https://www.swedbank.ee/private");
        await acceptCookies(page);
        await logIn(page, config.get("bank.swedbank.userId"), config.get("bank.swedbank.socialSecurityId"));
        const summary = await fetchAccountOverview(page);
        const transactions = await fetchTransactions(page);
        return {summary, transactions};
    } finally {
        await browser.close();
    }
}

async function acceptCookies(page: Page) {
    await page.click("#cookie-consent .ui-cookie-consent__accept-all-button");
    await page.waitForSelector("#cookie-consent .ui-modal__window", {hidden: true}); // Wait for modal to disappear
}

async function logIn(page: Page, userId: string, identityNumber: string) {
    await page.click("#SIMPLE_ID-control"); // Biomeetria
    await page.type("#SIMPLE_ID input[name='userId']", userId);
    await page.type("#SIMPLE_ID input[name='identityNumber']", identityNumber);
    await page.click("#SIMPLE_ID button[type='submit']");

    // Wait until logged in
    await withSpinner(page.waitForSelector("#last-login-container"), "Logging in with Face ID, check your phone");
}

async function fetchTransactions(page: Page): Promise<TransactionRow[]> {
    await page.click('a[data-wt-label="QL_Account_statement"]');

    await withSpinner(page.waitFor("#account-statement-form"), "Opening account statement page");
    await page.click(".period-list li:last-of-type a"); // Pick last predefined filter: Last month + current month

    await withSpinner(page.waitFor("#tblStatement"), "Changed filter, loading account statement");

    type TableRowData = { date: string, payerOrPayee: string, description: string, amount: string };
    const rows: TableRowData[] = await page.$$eval<TableRowData[]>("#tblStatement tbody tr", (tableRows) => {
        return tableRows.filter((tr) => tr.id.startsWith("t_0")).map((tr) => {
            const tdElements = tr.querySelectorAll("td");

            // 516737******4723 01.04.21 APPLE.COM/BILL ITUNES.COM -> 01.04.21 APPLE.COM/BILL ITUNES.COM
            const description = tdElements[3].innerText.replace(/^\d{6}\*+\d{4}\s+/, '');

            return {
                date: tdElements[1].innerText,
                payerOrPayee: tdElements[2].innerText,
                description: description,
                amount: tdElements[4].innerText,
            };
        });
    }) as any;

    return rows.map((tableRowData) => new TransactionRow(
        parseDate(tableRowData.date),
        parseNumber(tableRowData.amount),
        tableRowData.payerOrPayee || "Swedbank",
        tableRowData.description,
    ));
}

async function fetchAccountOverview(page: Page): Promise<Summary> {
    await page.waitFor("#accounts-balance tbody tr");

    const {bookedAmount, availableAmount} = await page.$eval("#accounts-balance tbody tr", (firstTr) => {
        const bookedAmount: string = firstTr.querySelector('td[data-th="Broneeritud"]').innerText;
        const availableAmount: string = firstTr.querySelector('td[data-th="Vaba jääk"]').innerText
            .replace(/\s+/, "") // 1 234.56EUR -> 1234.56EUR
            .replace("EUR", ""); // 1234.56EUR -> 1234.56

        return {bookedAmount, availableAmount};
    }) as any;

    return new Summary(
        Number(bookedAmount),
        Number(availableAmount),
    );
}

function parseNumber(numberAsString): number {
    return parseFloat(numberAsString.trim().replace(/[\s]+/, ""));
}

function parseDate(dateAsString): Date {
    return moment(dateAsString, "DD.MM.YYYY").toDate();
}
