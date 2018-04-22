type Currency = "EUR" | "USD" | "GBP" | "AUD" | "NZD" | string;

interface ISenderOrRecipient {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
}
export interface ITransaction {
    id: string;
    legId: string;
    type: "CARD_PAYMENT" | "TRANSFER" | "TOPUP" | "ATM";
    state: "COMPLETED" | "PENDING";
    startedDate: number;
    updatedDate: number;
    completedDate: number;
    currency: Currency;
    amount: number;
    fee: number;
    balance: number;
    description: string;
    comment?: string;
    rate?: number;
    merchant?: {
        id: string,
        scheme: string,
        name: string,
        country: string,
        city: string,
        mcc: string,
    };
    sender?: ISenderOrRecipient;
    recipient?: ISenderOrRecipient;
    counterpart?: {
        amount: number,
        currency: Currency,
    };
}

export interface IWalletPocket {
    id: string;
    type: string;
    state: "ACTIVE" | "INACTIVE";
    currency: Currency;
    balance: number;
    blockedAmount: number;
    closed: boolean;
}

export interface IWallet {
    id: string;
    ref: string;
    state: "ACTIVE" | "INACTIVE";
    baseCurrency: Currency;
    topupLimit: number;
    totalTopup: number;
    pockets: IWalletPocket[];
}
