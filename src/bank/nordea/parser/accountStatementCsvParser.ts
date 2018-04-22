import * as csvParse from "csv-parse";
import {promisify} from "es6-promisify";
import {AllHtmlEntities} from "html-entities";
import * as moment from "moment";
import {TransactionRow} from "../../base/transactionRow";

const asyncCsvParse: (input: string, options?: csvParse.Options) => Promise<any> = promisify(csvParse);

type CsvRow = {[key: string]: string};

export async function getTransactionsFromCsv(accountStatementCsv: string): Promise<TransactionRow[]> {
    const csvRows = await getCsvRows(accountStatementCsv);

    return csvRows.map((csvRow: CsvRow) => {
        let amount = parseNumberFromCsv(csvRow["Amount"]);
        amount = csvRow["Debit/Credit"] === "D" ? -1 * amount : amount;

        const date = getDate(csvRow);
        const payerOrPayee = getPayerOrPayee(csvRow);
        const description = getDescription(csvRow);

        return new TransactionRow(date, amount, payerOrPayee, description);
    });
}

async function getCsvRows(csv: string): Promise<CsvRow[]> {
    return asyncCsvParse(csv, {
        delimiter: ";",
        auto_parse: true,
        columns: true,
    });
}

function parseNumberFromCsv(text) {
    // Decimal separator = ","
    return parseFloat(text.trim().replace(",", "."));
}

function getDate(csvRow: CsvRow) {
    // "Cards debits 5355356245089251ITUNES.COM BILL05.04.18 12:14:05EUR 6.99" -> 05.04.18 12:14:05
    const debitMatch = /Cards debits \d{16}.+(\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}).+/.exec(csvRow["Details"]);
    if (debitMatch) {
        const dateAsString = debitMatch[1];
        return moment(dateAsString, "DD.MM.YYYY HH:mm:ss").toDate();
    }

    return moment(csvRow["Value date"], "DD.MM.YYYY").toDate();
}

function getPayerOrPayee(csvRow: CsvRow) {
    return new AllHtmlEntities().decode(csvRow["Beneficiary/payer name"]);
}

function getDescription(csvRow: CsvRow) {
    // "Cards debits 5355356245089251ITUNES.COM BILL05.04.18 12:14:05EUR 6.99"
    const cardDebitMatch = /Cards debits \d{16}(.+)\d{2}\.\d{2}\.\d{2}.+/.exec(csvRow["Details"]);
    if (cardDebitMatch) {
        // Extracts relevant part, for example "ITUNES.COM BILL"
        return cardDebitMatch[1];
    }

    // In other cases just remove irrelevant noise
    return csvRow["Details"]
        .replace("Internal Payment DR ", "")
        .replace("Internal Payment CR ", "")
        .replace("Incoming Euro Payment ", "")
        .replace("Outgoing Euro Payment ", "")
        .replace("Internal DB transfer ", "")
        .replace("Daily Banking Package fee ", "");
}
