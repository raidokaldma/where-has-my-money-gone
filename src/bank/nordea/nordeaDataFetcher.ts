import * as cheerio from "cheerio";
import got, {Got} from "got";
import * as moment from "moment";
import {CookieJar} from "tough-cookie";
import {withSpinner} from "../../common/promise-spinner";
import {sleep} from "../../common/util";
import {Config} from "../../config";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaDataFetcher {
    private got: Got;

    constructor(private config: Config) {
        this.got = got.extend({
            prefixUrl: "https://netbank.nordea.com",
            followRedirect: true,
            cookieJar: new CookieJar(),
        });
    }

    public async fetch(): Promise<NordeaTransactionData> {
        const welcomePage = await this.logIn();

        const accountSummaryUrl = findOnPage(urlHelpers.accountSummaryUrlRegex, welcomePage);
        const accountSummaryHtml = await withSpinner(this.fetchAccountSummaryPage(accountSummaryUrl), "Opening account summary page");

        const reservationsUrl = findOnPage(urlHelpers.reservationsPageUrlRegex, accountSummaryHtml);
        const reservationsHtml = await withSpinner(this.fetchReservationsPage(reservationsUrl), "Opening reservations page");

        const accountStatementUrl = findOnPage(urlHelpers.accountStatementUrlRegex, reservationsHtml);
        const accountStatementHtml = await withSpinner(this.fetchAccountStatementPage(accountStatementUrl), "Opening account statement page");

        const csvFormUrl = findOnPage(urlHelpers.csvFormUrlRegex, accountStatementHtml);
        const accountStatementCsv = await withSpinner(this.fetchCsv(csvFormUrl), "Fetching account statement CSV");

        return new NordeaTransactionData(this.config).init(accountSummaryHtml, accountStatementCsv, reservationsHtml);
    }

    private async logIn() {
        const loginPageHtml = await withSpinner(this.got.get(urlHelpers.loginPageUrl).text(), "Opening login page");
        const cs = findOnPage(urlHelpers.csValueRegex, loginPageHtml);

        // Page contains: <input type="hidden" name="org.apache.struts.taglib.html.TOKEN" value="ae762ddd1aa107554a75a64581dcc818">
        const strutsCsrfToken = findOnPage(urlHelpers.strutsCsrfTokenRegex, loginPageHtml);

        // Response: <?xml version="1.0" encoding="UTF-8"?><response status="ok"><login><authType>MOBILE_ID</authType><authCodeText>Code no.</authCodeText><gtDevice></gtDevice><authDeviceName>MOBILE_ID</authDeviceName></login><messages></messages></response>
        await withSpinner(this.got.get(urlHelpers.switchToMobileIdAuthentication(cs)).text(), "Changing authentication to Mobile-ID");

        // Response: <ajax><status>ok</status><message>1695</message></ajax>
        await withSpinner(this.got.get(urlHelpers.startMobileIdLogin(this.config.get("bank.nordea.userId"))).text(), "Authenticating with Mobile-ID");

        const mobileIdHash = await withSpinner(this.pollStatusUntilLoggedIn(), "Waiting for response from phone");

        const welcomePagePromise = this.got.post(urlHelpers.finishMobileIdLogin(cs), {
            form: {
                "org.apache.struts.taglib.html.TOKEN": strutsCsrfToken,
                "userId": this.config.get("bank.nordea.userId"),
                "mobileIdHash": mobileIdHash,
            },
        }).text();

        return withSpinner(welcomePagePromise, "Logging in and waiting for redirect to welcome page");
    }

    private async pollStatusUntilLoggedIn(): Promise<string> {
        const maxTries = 10;

        for (let i = 1; i <= maxTries; i++) {
            await sleep(3000);

            const mobileHash = await this.getMobileIdHash();

            if (mobileHash) {
                return mobileHash;
            }
        }
    }

    private async getMobileIdHash(): Promise<string | null> {
        // <ajax><status>ok</status><authenticated>no</authenticated></ajax>
        // <ajax><status>ok</status><authenticated>ok</authenticated><mobileHash>t+gWEYR707V1c5/k0bXHYXBE4ZKvkl/u1Qy5gFGtI74=</mobileHash></ajax>
        const statusXML = await this.got.get(urlHelpers.checkMobileIdLoginStatus()).text();
        return cheerio.load(statusXML)("mobileHash").text();
    }

    private async fetchAccountSummaryPage(accountSummaryUrl: any) {
        return this.got.get(accountSummaryUrl).text();
    }

    private async fetchReservationsPage(reservationsPageUrl: any) {
        return this.got.get(reservationsPageUrl).text();
    }

    private async fetchAccountStatementPage(accountStatementUrl: any) {
        return this.got.get(accountStatementUrl).text();
    }

    private async fetchCsv(csvFormUrl: string) {
        const startDate = moment()
            .subtract(1, "month")
            .format("DD.MM.YYYY");

        // For some reason, Nordea uses future dates for some pending transactions, setting an end date in the future will capture those too
        const endDateInTheFuture = moment()
            .add(1, "week")
            .format("DD.MM.YYYY");

        return this.got.post(csvFormUrl, {
            encoding: "binary", // Somehow fixes encoding issue
            form: {
                export: true,
                accountId: this.config.get("bank.nordea.accountIdForCsv"),
                layoutList: 4, // Format = CSV
                startDate,
                endDate: endDateInTheFuture,
            },
        }).text();
    }
}

function findOnPage(regex, page) {
    return regex.exec(page)[1];
}

const urlHelpers = {
    loginPageUrl: "pnb/login.do?ts=EE&language=en",
    csValueRegex: /loginConfig\.urlGetUserId = '.+;cs=(.+)';/,
    strutsCsrfTokenRegex: /name=".+"\s+value="(.+)"/,
    switchToMobileIdAuthentication: (cs) => `pnb/login.do?act=chg_auth&auth=MOBILE_ID&ajax=true&cs=${cs}`,
    startMobileIdLogin: (userId) => `pnb/mobile_id_action.do?type=login&act=sendRequest&id=${userId}&time=${Date.now()}`,
    checkMobileIdLoginStatus: () => `pnb/mobile_id_action.do?type=login&act=getStatus&time=${Date.now()}`,
    finishMobileIdLogin: (cs) => `pnb/login1.do?act=initializeMobileId&cs=${cs}`,
    passwordChangePageUrlRegex: "pnb/ll_pass_chg_login.do",
    accountSummaryUrlRegex: /"[/](pnb[/]acnt.do[?]ms=true.+?)"/,
    reservationsPageUrlRegex: /"[/](pnb[/]acnt.do[?]act=hld.+?)"/,
    accountStatementUrlRegex: /"[/](pnb[/]acnt.do[?]act=sr.+?)"/,
    csvFormUrlRegex: /"[/](pnb[/]acnt_sr.do[?]act=sr.+?)"/,
};
