import * as moment from "moment";
import {RequestAPI, RequiredUriUrl} from "request";
import * as request from "request-promise-native";
import {withSpinner} from "../../common/promise-spinner";
import {Config} from "../../config";
import {ITransaction, IWallet} from "./responseTypes";
import {RevolutTransactionData} from "./revolutTransactionData";

export class RevolutDataFetcher {
    private config: Config;
    private request: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;

    constructor(config: Config) {
        this.config = config;
        this.request = request.defaults({
            baseUrl: "https://api.revolut.com",
            auth: {
                pass: this.config.get("bank.revolut.clientSecret"),
                user: this.config.get("bank.revolut.clientId"),
            },
            headers: {
                "User-Agent": "",
                "X-Api-Version": "1",
                "X-Device-Id": this.config.get("bank.revolut.deviceId"),
            },
            json: true,
        });
    }

    public async fetch(): Promise<RevolutTransactionData> {
        const fromDate = moment().subtract(1, "month").toDate();

        const transactionsResponse = await withSpinner(
            this.request.get(`/user/current/transactions?from=${fromDate.valueOf()}`) as Promise<ITransaction[]>,
            "Fetching transactions",
        );

        const walletResponse = await withSpinner(
            this.request.get(`/user/current/wallet`) as Promise<IWallet>,
            "Fetching balance",
        );

        return new RevolutTransactionData(transactionsResponse, walletResponse).init();
    }
}
