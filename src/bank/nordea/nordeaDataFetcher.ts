import * as cheerio from "cheerio";
import * as moment from "moment";
import {RequestAPI, RequiredUriUrl} from "request";
import * as request from "request-promise-native";
import {TextDecoder} from "text-encoding";
import {withSpinner} from "../../common/promise-spinner";
import {Config} from "../../config";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaDataFetcher {
    private config: Config;
    private request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;

    constructor(config: Config) {
        this.config = config;

        this.request = request.defaults({
            baseUrl: "https://netbank.nordea.com",
            jar: request.jar(),
        });
    }

    public async fetch(): Promise<NordeaTransactionData> {
        const mainPageUrl = await this.logIn();
        const mainPageHtml = await withSpinner(this.fetchMainPage(mainPageUrl), "Logged in, opening main page");

        const accountSummaryUrl = findOnPage(urlHelpers.accountSummaryUrlRegex, mainPageHtml);
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

        const loginStep1Url = urlHelpers.getLoginStep1Url(cs);
        await withSpinner(this.request.post(loginStep1Url, {
            form: {
                userId: this.config.get("bank.nordea.userId"),
            },
        }), "Login step 1, sending username");

        const loginStep2Url = urlHelpers.getLoginStep2Url(cs);
        const responsePromise: Promise<string> = this.request.post(loginStep2Url, {
            form: {
                authCode: this.config.get("bank.nordea.password"),
            },
        });
        // <?xml version="1.0" encoding="UTF-8"?>
        // <response status="ok">
        //     <login>
        //         <path>/pnb/Welcome.do?userts=ee&amp;cs=123456</path>
        //     </login>
        //     <messages>...</messages>
        // </response>
        const loginStep2Xml = await withSpinner(responsePromise, "Login step 2, sending password");

        const $ = cheerio.load(loginStep2Xml);
        return $("path").text();
    }

    private async fetchMainPage(welcomeUrl: string) {
        return this.request.get(welcomeUrl);
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
    getLoginStep1Url: (cs) => `/pnb/login1.do?ts=EE&act=id&ajax=true&cs=${cs}`,
    getLoginStep2Url: (cs) => `/pnb/login2.do?act=auth&ajax=true&cs=${cs}`,
    accountSummaryUrlRegex: /"([/]pnb[/]acnt.do[?]ms=true.+?)"/,
    reservationsPageUrlRegex: /"([/]pnb[/]acnt.do[?]act=hld.+?)"/,
    accountStatementUrlRegex: /"([/]pnb[/]acnt.do[?]act=sr.+?)"/,
    csvFormUrlRegex: /"([/]pnb[/]acnt_sr.do[?]act=sr.+?)"/,
};
