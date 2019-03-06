import {RequestAPI, RequiredUriUrl} from "request";
import * as request from "request-promise-native";
import {TextDecoder} from "text-encoding";
import {withSpinner} from "../../common/promise-spinner";
import {sleep} from "../../common/util";
import {Config} from "../../config";
import {AuthResponse} from "./responseTypes";
import {SwedbankTransactionData} from "./swedbankTransactionData";

const numberOfTransactionsToFetch = 30;

export class SwedbankDataFetcher {
    private config: Config;
    private request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;

    constructor(config: Config) {
        this.config = config;

        this.request = request.defaults({
            baseUrl: "https://www.swedbank.ee",
            headers: {
                "User-Agent": "iPhone",
            },
            form: {
                language: "ENG",
            },
        });
    }

    public async fetch(): Promise<SwedbankTransactionData> {
        const {securityId, sessionId} = await withSpinner(this.logInWithSmartId(), "Logging in with Smart-ID");

        const accountOverviewHtml = await withSpinner(
            this.fetchAccountOverviewHtml(sessionId, securityId),
            "Fetching account overview",
        );
        const transactionsHtml = await withSpinner(
            this.fetchTransactionsHtml(sessionId, securityId),
            "Fetching transactions",
        );

        return new SwedbankTransactionData(this.config).init(accountOverviewHtml, transactionsHtml);
    }

    private async logInWithSmartId(): Promise<{ securityId: string, sessionId: string }> {
        const {securityId, sessionId} = await this.startSmartIdLogIn();

        await this.pollStatusUntilLoggedIn(securityId, sessionId);

        return {securityId, sessionId};
    }

    private async startSmartIdLogIn(): Promise<{ securityId: string, sessionId: string }> {
        const responseJson: AuthResponse = await this.request.post("/touch/auth", {
            form: {
                userId: this.config.get("bank.swedbank.userId"),
                authPwd: this.config.get("bank.swedbank.socialSecurityId"),
                smartIdLogin: "true",
                authenticate: "true",
            },
            json: true,
        });

        return {securityId: responseJson.securityId, sessionId: responseJson.sessionId};
    }

    private async pollStatusUntilLoggedIn(securityId: string, sessionId: string): Promise<void> {
        const maxTries = 10;

        for (let i = 1; i <= maxTries; i++) {
            // It seems response does not reveal if Smart-ID login attempt was cancelled. This is a workaround.
            if (i === maxTries) {
                throw new Error("Could not log in with Smart-ID");
            }

            await sleep(3000);

            const isLoggedIn = await this.checkIfLoggedIn(securityId, sessionId);

            if (isLoggedIn) {
                break;
            }
        }
    }

    private async checkIfLoggedIn(securityId: string, sessionId: string): Promise<boolean> {
        const responseJson: AuthResponse = await this.request.post(`/touch/auth;jsessionid=${sessionId}`, {
            form: {
                userId: this.config.get("bank.swedbank.userId"),
                smartIdLogin: "true",
                authenticate: "true",
                securityId,
            },
            json: true,
        });

        const isLoggedIn = !!responseJson.customerName;
        return isLoggedIn;
    }

    private async fetchTransactionsHtml(sessionId: string, securityId: string): Promise<string> {
        return this.request.post(`/touch/overview/account;jsessionid=${sessionId}`, {
            form: {
                securityId,
                numberOfTransactions: numberOfTransactionsToFetch,
            },
        });
    }

    private async fetchAccountOverviewHtml(sessionId: string, securityId: string): Promise<string> {
        return this.request.post(`/touch/overview;jsessionid=${sessionId}`, {
            form: {
                securityId,
            },
        });
    }
}
