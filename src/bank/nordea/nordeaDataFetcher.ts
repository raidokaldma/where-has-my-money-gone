import * as cheerio from "cheerio";
import * as moment from "moment";
import {RequestAPI, RequiredUriUrl} from "request";
import * as request from "request-promise-native";
import {TextDecoder} from "text-encoding";
import {withSpinner} from "../../common/promise-spinner";
import {sleep} from "../../common/util";
import {Config} from "../../config";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaDataFetcher {
    private request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;

    constructor(private config: Config) {
        this.request = request.defaults({
            baseUrl: "https://netbank.nordea.com",
            followAllRedirects: true,
            jar: request.jar(),
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
        const loginPageHtml = await withSpinner(this.request.get(urlHelpers.loginPageUrl), "Opening login page");
        const cs = findOnPage(urlHelpers.csValueRegex, loginPageHtml);

        // Page contains: <input type="hidden" name="org.apache.struts.taglib.html.TOKEN" value="ae762ddd1aa107554a75a64581dcc818">
        const strutsCsrfToken = findOnPage(urlHelpers.strutsCsrfTokenRegex, loginPageHtml);

        // Response: <?xml version="1.0" encoding="UTF-8"?><response status="ok"><login><authType>MOBILE_ID</authType><authCodeText>Code no.</authCodeText><gtDevice></gtDevice><authDeviceName>MOBILE_ID</authDeviceName></login><messages></messages></response>
        await withSpinner(this.request.get(urlHelpers.switchToMobileIdAuthentication(cs)), "Changing authentication to Mobile-ID");

        // Response: <ajax><status>ok</status><message>1695</message></ajax>
        await withSpinner(this.request.get(urlHelpers.startMobileIdLogin(this.config.get("bank.nordea.userId"))), "Authenticating with Mobile-ID");

        const mobileIdHash = await withSpinner(this.pollStatusUntilLoggedIn(), "Waiting for response from phone");

        const welcomePagePromise = this.request.post(urlHelpers.finishMobileIdLogin(cs), {
            form: {
                "org.apache.struts.taglib.html.TOKEN": strutsCsrfToken,
                "userId": this.config.get("bank.nordea.userId"),
                "mobileIdHash": mobileIdHash,
            },
        });
        const welcomePageHtml = await withSpinner(welcomePagePromise, "Logging in and waiting for redirect to welcome page");

        return welcomePageHtml;
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
        const statusXML = await this.request.get(urlHelpers.checkMobileIdLoginStatus());

        const mobileHash = cheerio.load(statusXML)("mobileHash").text();
        return mobileHash;
    }

    private async fetchAccountSummaryPage(accountSummaryUrl: any) {
        return this.request.get(accountSummaryUrl);
    }

    private async fetchReservationsPage(reservationsPageUrl: any) {
        return this.request.get(reservationsPageUrl);
    }

    private async fetchAccountStatementPage(accountStatementUrl: any) {
        return this.request.get(accountStatementUrl);
    }

    private async fetchCsv(csvFormUrl: string) {
        const startDate = moment()
            .subtract(1, "month")
            .format("DD.MM.YYYY");

        // For some reason, Nordea uses future dates for some pending transactions, setting an end date in the future will capture those too
        const endDateInTheFuture = moment()
            .add(1, "week")
            .format("DD.MM.YYYY");

        const csvInBytes = await this.request.post(csvFormUrl, {
            encoding: null, // Return bytes instead of string
            form: {
                export: true,
                accountId: this.config.get("bank.nordea.accountIdForCsv"),
                layoutList: 4, // Format = CSV
                startDate,
                endDate: endDateInTheFuture,
            },
        });
        return new TextDecoder("windows-1252").decode(csvInBytes);
    }
}

function findOnPage(regex, page) {
    return regex.exec(page)[1];
}

const urlHelpers = {
    loginPageUrl: "/pnb/login.do?ts=EE&language=en",
    csValueRegex: /loginConfig\.urlGetUserId = '.+;cs=(.+)';/,
    strutsCsrfTokenRegex: /name=".+"\s+value="(.+)"/,
    switchToMobileIdAuthentication: (cs) => `/pnb/login.do?act=chg_auth&auth=MOBILE_ID&ajax=true&cs=${cs}`,
    startMobileIdLogin: (userId) => `/pnb/mobile_id_action.do?type=login&act=sendRequest&id=${userId}&time=${Date.now()}`,
    checkMobileIdLoginStatus: () => `/pnb/mobile_id_action.do?type=login&act=getStatus&time=${Date.now()}`,
    finishMobileIdLogin: (cs) => `/pnb/login1.do?act=initializeMobileId&cs=${cs}`,
    passwordChangePageUrlRegex: "/pnb/ll_pass_chg_login.do",
    accountSummaryUrlRegex: /"([/]pnb[/]acnt.do[?]ms=true.+?)"/,
    reservationsPageUrlRegex: /"([/]pnb[/]acnt.do[?]act=hld.+?)"/,
    accountStatementUrlRegex: /"([/]pnb[/]acnt.do[?]act=sr.+?)"/,
    csvFormUrlRegex: /"([/]pnb[/]acnt_sr.do[?]act=sr.+?)"/,
};
