import { launch, Page } from "puppeteer";
import { withSpinner } from "../../common/promise-spinner";
import { Config } from "../../config";
import { Summary } from "../base/summary";
import { TransactionRow } from "../base/transactionRow";
import { Account, DataEntity } from "./response-types/account";
import { Report, TransactionList } from "./response-types/report";

export async function fetchTransactionsAndSummary(config: Config): Promise<{ summary: Summary, transactions: TransactionRow[] }> {

    const browser = await launch({ headless: true });

    try {
        const page = await browser.newPage();

        await page.goto("https://luminor.ee/?m=login-modal");
        await page.waitForNavigation({ waitUntil: "networkidle0" });

        const smartIdCode = await withSpinner(login(page, config), "Logging in with Smart-ID");
        const summary = await withSpinner(fetchSummary(page, config), `Check your phone, code is ${smartIdCode}`);
        const transactions = await withSpinner(fetchTransactions(page), "Fetching transactions");

        return { summary, transactions };
    } finally {
        await browser.close();
    }
}

async function login(page: Page, config: Config): Promise<string> {
    await page.type("#smartid", config.get("bank.luminor.userId"));
    await page.keyboard.press("Tab");
    await page.keyboard.type(config.get("bank.luminor.socialSecurityId"));
    await page.click("ul.layout-centered button:not([disabled])"); // Login button

    const smartIdCodeElement = await page.waitForSelector(".code-display-code");
    const smartIdCode = await (await smartIdCodeElement.getProperty("innerText")).jsonValue() as string;

    return smartIdCode;
}

async function fetchSummary(page: Page, config: Config): Promise<Summary> {
    const accountResponse = await page.waitForResponse((response) => response.url().endsWith("/account") && response.request().postData().includes("withBalance"));
    const json = await accountResponse.json() as Account;

    const account: DataEntity = json.Payload.DataEntity
        .find((d) => d.Account.AccountId.AcctIds.IBAN === config.get("bank.luminor.iban"));

    const availableAmt: string = account.Account.BalanceList
        .find((b) => b.BalType?.DSC === "Available Balance")
        .CurrAmt.Amt.Value;
    const totalHeldAmt: string = account.Account.BalanceList
        .find((b) => b.BalType?.DSC === "Total Hold Amount")
        .CurrAmt.Amt.Value;

    return new Summary(Number(totalHeldAmt), Number(availableAmt));
}

async function fetchTransactions(page: Page): Promise<TransactionRow[]> {
    await page.goto("https://luminor.ee/auth/#/web/view/overview/landing");
    await page.waitForNavigation({ waitUntil: "networkidle0" });

    await page.click(".container-desktop .download-pdf-wrap .tooltip-dropdown-container .label-container");
    await page.click(".container-desktop .download-pdf-wrap .tooltip-dropdown-container .csv");
    await page.$eval(".download-pdf-wrap button", (el) => el.click());

    const reportResponse = await page.waitForResponse((response) => response.url().endsWith("/report"));
    const json = await reportResponse.json() as Report;

    const transactions = json.Payload.DataEntity[0].PayLoads[0].DataEntity[0].TransactionList
        .map((t: TransactionList) => {
            const isoDate = `${t.OrigDt.Year}-${t.OrigDt.Month}-${t.OrigDt.Day}`; // YYYY-MM-DD
            const isDebit = t.TxnType.TypVal.CDE === "DEBIT";
            const amount = (isDebit ? -1 : 1) * Number(t.TotalCurAmt.Amt.Value);
            const payerOrPayee = t.TxnRef?.CntrPrtyDta?.CntrPrtyNme;
            const description = t.Memo;

            return new TransactionRow(new Date(isoDate), amount, payerOrPayee, description);
        });
    return transactions;
}
