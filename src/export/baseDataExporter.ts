import {Bank} from "../bank/base/bank";

export interface IBankDataExporter {
    export(bankData: Bank): Promise<void>;
}
