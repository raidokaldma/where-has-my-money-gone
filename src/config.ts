import * as _ from "lodash";

export class Config {
    private config: string;

    constructor(configJson = readConfigFromFile()) {
        this.config = configJson;
    }

    public get(configKey) {
        return _.get(this.config, configKey);
    }
}

const readConfigFromFile = () => {
    try {
        return require("../user-config.json");
    } catch (error) {
        if (error.code === "MODULE_NOT_FOUND") {
            throw Error("Make sure user-config.json file exists. Use user-config.json.template as an example.");
        }
        throw error;
    }
};
