type AuthResponseBeforeLogin = {
    challenge: string,
    sessionId: string,
    securityId: string,
    pollingStatus: string,
    loginType: number,
    securityLevel: number,
};

type AuthResponseAfterLogin = {
    customerName: string,
    sessionSettingsDefined: boolean,
    sessionId: string,
    hasBusinessAccounts: boolean,
    securityId: string,
    usersCustomerId: string,
    disclaimerAccepted: boolean,
    pollingStatus: string,
    allowSingleSession: boolean,
    loginType: number,
    securityLevel: number,
    hasPrivateAccounts: boolean,
    warnings: string[],
};

export type AuthResponse = AuthResponseBeforeLogin & AuthResponseAfterLogin;
