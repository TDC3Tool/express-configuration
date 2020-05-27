import swaggerUi from 'swagger-ui-express'
import { Router } from 'express'
import * as swaggerDocs from './swagger.json'

/* Configure Swagger for non-production environment */

export default () => {
	const router = Router()
	const swaggerUiOptions = {
		customSiteTitle: 'Stockal Cash Mangement SwaggerUI',
		customCss: '.swagger-ui .topbar { display: none }' // hide swagger header
	}

	router.use('/', swaggerUi.serve)
	router.get('/', swaggerUi.setup(swaggerDocs, swaggerUiOptions))
	router.get('/configuration', (_, res) => {
		res.status(200).json(swaggerDocs)
	})

	return router
}
