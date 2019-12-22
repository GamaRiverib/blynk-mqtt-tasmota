import * as winston from "winston";
const chalk = require("chalk");
const { colorize, combine, timestamp, printf, label, splat } = winston.format;

const LOG_FORMAT = (l: string) => combine(
    timestamp(),
    splat(),
    colorize(),
    label({ label: l }),
    printf(m => `${m.timestamp} ${chalk.cyan(m.label)} ${m.level}: ${m.message}\t${m.data ? JSON.stringify(m.data) : ""}`)
);

export function getLogger(label: string): winston.Logger {
    const loggerOptions: winston.LoggerOptions = { 
        level: process.env.LOG_LEVEL || "info",
        transports: [new winston.transports.Console({})],
        format: LOG_FORMAT(label)
    };
    return winston.createLogger(loggerOptions);
}