import os from 'os'
import DailyRotateFile from 'winston-daily-rotate-file'
import { createLogger, format, transports } from 'winston'
import { name as serviceName } from '../../package.json'

const { combine, json, colorize, printf } = format

const logFormat = printf(
	({ level, timestamp, host, message }) =>
		`${level} - ${timestamp} - ${host} - ${JSON.stringify(message, null, 4)}`
)

const consoleFormat = printf(
	({ level, timestamp, message }) =>
		`${level} - ${timestamp} - ${JSON.stringify(message, null, 2)}`
)

const timestampFormat = format.timestamp({
	format: 'MM-DD-YYYY HH:mm:ss'
})

const consoleTransportOptions = {
	format: combine(colorize(), timestampFormat, consoleFormat),
	level: 'debug'
}

const fileTransportOptions = (service, logsfolder) => ({
	datePattern: 'YYYY-MM-DD',
	dirname: logsfolder,
	filename: `${service}-%DATE%.log`,
	format: combine(timestampFormat, logFormat),
	level: 'debug',
	maxFiles: '15d',
	maxSize: '100m',
	zippedArchive: false
})

const httpTransportOptions = service => ({
	format: combine(timestampFormat, logFormat, json()),
	host: 'http-intake.logs.datadoghq.com',
	level: 'info',
	path: `/v1/input/${process.env.DD_API_KEY}?ddsource=nodejs&service=${service}`,
	ssl: true
})

/**
 * Create a custom Winston logger instance
 * @param {Object} options - configurable via Node env variables:
 * 				 			NODE_ENV
 * 							LOGS_FOLDER
 * 							DD_API_KEY
 * @param {string} service - service name
 * @returns {winston.logger}
 */
export const createWinstonLogger = (
	service,
	{
		env = process.env.NODE_ENV || 'dev',
		logsFolder = process.env.LOGS_FOLDER || 'logs',
		ddogApiKey = process.env.DD_API_KEY
	} = {}
) => {
	if (!service) {
		throw new Error('Missing Mandatory Parameter - service')
	}

	const logger = createLogger({
		defaultMeta: {
			env,
			host: os.hostname(),
			service
		},
		exitOnError: false,
		transports: [
			new transports.Console(consoleTransportOptions),
			new DailyRotateFile(fileTransportOptions(service, logsFolder))
		]
	})

	if (ddogApiKey) {
		logger.add(new transports.Http(httpTransportOptions(service)))
	}

	// create a stream object with a 'write' function that will be used by `morgan`
	logger.stream = {
		write: message => {
			// use the 'info' log level for loggin in both file and console transports
			logger.info(message)
		}
	}

	logger.debug(`Environment: ${logger.defaultMeta.env}`)
	return logger
}

/**
 * Default Winston Instance for the application
 * Service name configured to application name
 */
export const winston = createWinstonLogger(serviceName)
