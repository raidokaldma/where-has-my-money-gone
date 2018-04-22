import * as cheerio from "cheerio";
import * as moment from "moment";
import {RequestAPI, RequiredUriUrl} from "request";
import * as request from "request-promise-native";
import {TextDecoder} from "text-encoding";
import {Config} from "../../config";
import {ProgressMessageCallback} from "../base/bank";
import {NordeaTransactionData} from "./nordeaTransactionData";

export class NordeaDataFetcher {
    private config: Config;
    private sendProgress: ProgressMessageCallback;
    private request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;

    constructor(config: Config, progressCallback: ProgressMessageCallback) {
        this.config = config;
        this.sendProgress = progressCallback;

        this.request = request.defaults({
            baseUrl: "https://netbank.nordea.com",
            jar: request.jar(),
        });
    }

    public async fetch(): Promise<NordeaTransactionData> {
        const mainPageUrl = await this.logIn();
        const mainPageHtml = await this.fetchMainPage(mainPageUrl);

        const accountSummaryUrl = findOnPage(urlHelpers.accountSummaryUrlRegex, mainPageHtml);
        const accountSummaryHtml = await this.fetchAccountSummaryPage(accountSummaryUrl);

        const reservationsUrl = findOnPage(urlHelpers.reservationsPageUrlRegex, accountSummaryHtml);
        const reservationsHtml = await this.fetchReservationsPage(reservationsUrl);

        const accountStatementUrl = findOnPage(urlHelpers.accountStatementUrlRegex, reservationsHtml);
        const accountStatementHtml = await this.fetchAccountStatementPage(accountStatementUrl);

        const csvFormUrl = findOnPage(urlHelpers.csvFormUrlRegex, accountStatementHtml);
        const accountStatementCsv = await this.fetchCsv(csvFormUrl);

        return new NordeaTransactionData(this.config).init(accountSummaryHtml, accountStatementCsv, reservationsHtml);
    }

    private async logIn() {
        this.sendProgress("Opening login page");
        const loginPageHtml = await this.request.get(urlHelpers.loginPageUrl);
        const cs = findOnPage(urlHelpers.csValueRegex, loginPageHtml);

        this.sendProgress("Login step 1, sending username");
        const loginStep1Url = urlHelpers.getLoginStep1Url(cs);
        await this.request.post(loginStep1Url, {
            form: {
                userId: this.config.get("bank.nordea.userId"),
            },
        });

        this.sendProgress("Login step 2, sending password");
        const loginStep2Url = urlHelpers.getLoginStep2Url(cs);

        // <?xml version="1.0" encoding="UTF-8"?>
        // <response status="ok">
        //     <login>
        //         <path>/pnb/Welcome.do?userts=ee&amp;cs=123456</path>
        //     </login>
        //     <messages>...</messages>
        // </response>
        const loginStep2Xml = await this.request.post(loginStep2Url, {
            form: {
                authCode: this.config.get("bank.nordea.password"),
            },
        });

        const $ = cheerio.load(loginStep2Xml);
        return $("path").text();
    }

    private async fetchMainPage(welcomeUrl: string) {
        this.sendProgress("Logged in, opening main page");
        return this.request.get(welcomeUrl);
    }

    private async fetchAccountSummaryPage(accountSummaryUrl: any) {
        this.sendProgress("Opening account summary page");
        return this.request.get(accountSummaryUrl);
    }

    private async fetchReservationsPage(reservationsPageUrl: any) {
        this.sendProgress("Opening reservations page");
        return this.request.get(reservationsPageUrl);
    }

    private async fetchAccountStatementPage(accountStatementUrl: any) {
        this.sendProgress("Opening account statement page");
        return this.request.get(accountStatementUrl);
    }

    private async fetchCsv(csvFormUrl: string) {
        this.sendProgress("Fetching account statement CSV");

        const startOfPreviousMonth = moment()
            .subtract(1, "month")
            .startOf("month")
            .format("DD.MM.YYYY");

        const endDateInTheFuture = moment()
            .add(1, "month")
            .format("DD.MM.YYYY");

        const csvInBytes = await this.request.post(csvFormUrl, {
            encoding: null, // Return bytes instead of string
            form: {
                export: true,
                accountId: this.config.get("bank.nordea.accountIdForCsv"),
                layoutList: 4, // Format = CSV
                startDate: startOfPreviousMonth,
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
