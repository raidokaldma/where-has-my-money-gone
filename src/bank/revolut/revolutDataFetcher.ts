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
            prefixUrl: "https://api.revolut.com",
            username: this.config.get("bank.revolut.clientId"),
            password: this.config.get("bank.revolut.clientSecret"),
            headers: {
                "User-Agent": "",
                "X-Api-Version": "1",
                "X-Device-Id": this.config.get("bank.revolut.deviceId"),
            },
            responseType: "json",
        });
    }

    public async fetch(): Promise<RevolutTransactionData> {
        const fromDate = moment().subtract(1, "month").toDate();

        const transactionsResponse = await withSpinner(
            this.got.get(`user/current/transactions?count=500&from=${fromDate.valueOf()}`).json<ITransaction[]>(),
            "Fetching transactions",
        );

        const walletResponse = await withSpinner(
            this.got.get(`user/current/wallet`).json<IWallet>(),
            "Fetching balance",
        );

        return new RevolutTransactionData(transactionsResponse, walletResponse).init();
    }
}
