import got, {Got} from "got";
import * as moment from "moment";
import {withSpinner} from "../../common/promise-spinner";
import {readUserInput} from "../../common/read-user-input";
import {Config} from "../../config";
import {ITransaction, IWallet} from "./responseTypes";
import {RevolutTransactionData} from "./revolutTransactionData";

export class RevolutDataFetcher {
    private got: Got;

    constructor(private config: Config) {
        this.got = got.extend({
            headers: {
                "User-Agent": "Mozilla/5.0 github.com/raidokaldma/where-has-my-money-gone",
                "X-Device-Id": this.config.get("bank.revolut.deviceId"),
            },
            responseType: "json",
        });
    }

    public async fetch(): Promise<RevolutTransactionData> {
        const token = await this.acquireToken();

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
        await this.got.post("https://app.revolut.com/api/retail/auth", {
            json: {
                phone: this.config.get("bank.revolut.phoneNumber"),
            },
        }).json();

        const confirmationCode = await readUserInput("Enter confirmation code from email: ");

        const {accessToken} = await this.got.post("https://app.revolut.com/api/retail/auth/signin", {
            json: {
                phone: this.config.get("bank.revolut.phoneNumber"),
                code: confirmationCode,
                password: this.config.get("bank.revolut.password"),
            },
        }).json();

        return accessToken;
    }
}
