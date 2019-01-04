const winston = require('winston');


class Logger {
    constructor (data) {
        this.context = data.context

        let customLevels = {
            levels: {
                error: 0,
                info: 1,
                action: 2,
                success: 3
            },
            colors: {
                error: "red",
                info: "cyan",
                action: "yellow",
                success: "bold white greenBG"
            }
        }

        winston.createLogger({
            levels: customLevels.levels,
            transports: [new winston.transports.Console({
                level: "action", format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.json(),
                    winston.format.timestamp(),
                    winston.format.printf(info => {
                        return `${info.timestamp} ${info.level} [${data.context}]: ${info.message}`
                    })
                ), colorize: true
            }),
                new winston.transports.File({level: "action", format: winston.format.combine(
                    winston.format.json(),
                    winston.format.timestamp(),
                    winston.format.printf(info => {
                        return `${info.timestamp} ${info.level} [${data.context}]: ${info.message}`
                    })
                ),filename: 'logs.log'})]
        })

        let logger = winston.createLogger({
            levels: customLevels.levels,
            transports: [new winston.transports.Console({level: "success", format: winston.format.combine(
                winston.format.colorize(),
                winston.format.json(),
                winston.format.timestamp(),
                winston.format.printf(info => {
                    return `${info.timestamp} ${info.level} [${data.context}]: ${info.message}`
                })
            ), colorize: true}),
                new winston.transports.File({level: "action", format: winston.format.combine(
                    winston.format.json(),
                    winston.format.timestamp(),
                    winston.format.printf(info => {
                        return `${info.timestamp} ${info.level} [${data.context}]: ${info.message}`
                    })
                ),filename: __dirname + '/../logs.log'})]
        })

        winston.addColors(customLevels.colors)

        return logger
    }
}

module.exports = Logger
