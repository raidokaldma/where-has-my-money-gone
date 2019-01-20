import * as commandLineArgs from "command-line-args";
import * as commandLineUsage from "command-line-usage";
import {fetchAndExportMultiple, isValidBankName, ValidBankNames} from "./application";

const commandLineArgsDefinitions = [
    {
        name: "help",
        type: Boolean,
        description: "Displays this help page",
    },
    {
        alias: "b",
        name: "bankNames",
        type: String,
        multiple: true,
        defaultOption: true,
        typeLabel: ValidBankNames.join(" "),
        description: "Space-separated list of bank names",
    },
];

const commandLineUsageSections = [
    {
        header: "Description",
        content: "Simple application for fetching bank account information from multiple banks. " +
        "Displays account overview and transaction history in console and exports data to YNAB compatible CSV format.",
    },
    {
        header: "Options",
        optionList: commandLineArgsDefinitions,
    },
];

(async () => {
    const parsedArgs = commandLineArgs(commandLineArgsDefinitions);
    const bankNames: string[] = parsedArgs.bankNames;

    if (parsedArgs.help) {
        showCommandLineUsage();
    } else if (!bankNames) {
        showCommandLineUsage();
    } else {
        await executeWith(bankNames);
    }
})().catch((error) => {
    console.error(`😱 Uh-oh, something broke.\n`, error.message);
});

function showCommandLineUsage() {
    const usage = commandLineUsage(commandLineUsageSections);
    console.log(usage);
}

async function executeWith(bankNames) {
    const isValid = validateAndShowError(bankNames);
    if (!isValid) {
        return;
    }

    await fetchAndExportMultiple(bankNames);
}

function validateAndShowError(bankNames) {
    const invalidBankNames = bankNames.filter((bankName) => !isValidBankName(bankName));
    if (invalidBankNames.length > 0) {
        console.error(`Invalid bank names: ${invalidBankNames.join(", ")}`);
        return false;
    }
    return true;
}
