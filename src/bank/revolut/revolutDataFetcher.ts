import got, {Got} from "got";
import * as moment from "moment";
import {withSpinner} from "../../common/promise-spinner";
import {Config} from "../../config";
import {ITransaction, IWallet} from "./responseTypes";
import {RevolutTransactionData} from "./revolutTransactionData";

export class RevolutDataFetcher {
    private got: Got;

    constructor(private config: Config) {
        this.got = got.extend({
            headers: {
                "user-agent": "github.com/raidokaldma/where-has-my-money-gone Chrome/87.0.4280.101",
                "x-device-id": this.config.get("bank.revolut.deviceId"),
                "x-browser-application": "WEB_CLIENT",
                "x-client-version": "100.0",
            },
            responseType: "json",
        });
    }

    public async fetch(): Promise<RevolutTransactionData> {
        const token = await withSpinner(this.acquireToken(), "Logging in, check your phone");

        const fromDate = moment().subtract(1, "month").toDate();

        const transactionsResponse = await withSpinner(
            this.got.get(`https://api.revolut.com/user/current/transactions?count=500&from=${fromDate.valueOf()}`, {
                username: this.config.get("bank.revolut.clientId"),
                password: token,
            }).json<ITransaction[]>(),
            "Fetching transactions",
        );

        const walletResponse = await withSpinner(
            this.got.get(`https://api.revolut.com/user/current/wallet`, {
                username: this.config.get("bank.revolut.clientId"),
                password: token,
            }).json<IWallet>(),
            "Fetching balance",
        );

        return new RevolutTransactionData(transactionsResponse, walletResponse).init();
    }

    private async acquireToken() {
        const {tokenId} = await this.got.post("https://app.revolut.com/api/retail/signin", {
            json: {
                phone: this.config.get("bank.revolut.phoneNumber"),
                password: this.config.get("bank.revolut.password"),
                channel: "APP",
            },
        }).json();

        const {accessToken} = await this.got.post("https://app.revolut.com/api/retail/token", {
            retry: {
                methods: ["POST"],
                statusCodes: [422],
                limit: 30,
            },
            json: {
                tokenId,
                password: this.config.get("bank.revolut.password"),
                phone: this.config.get("bank.revolut.phoneNumber"),
            },
        }).json();

        return accessToken;
    }
}
