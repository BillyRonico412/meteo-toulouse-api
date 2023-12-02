import express from "express"
import morgan from "morgan"
import dotenv from "dotenv"
import { z } from "zod"
import to from "await-to-js"
import cors from "cors"

interface Cache {
	timestamp: number
	data: any
}

let cache: Cache | undefined = undefined

dotenv.config()

const env = z
	.object({
		API_KEY: z.string(),
		PORT: z.string(),
	})
	.parse(process.env)

const INSEE = 31555

const app = express()
app.use(morgan("dev"))
app.use(cors())

app.get("/", async (_, res) => {
	if (cache) {
		const currentHour = new Date().getHours()
		const cacheHour = new Date(cache.timestamp).getHours()
		if (currentHour === cacheHour) {
			return res.status(200).json(cache.data)
		}
	}

	const [errFetchResPeriods, fetchResPeriods] = await to(
		fetch(
			`https://api.meteo-concept.com/api/forecast/daily/periods?insee=${INSEE}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${env.API_KEY}`,
				},
			},
		),
	)

	if (errFetchResPeriods) {
		console.error(errFetchResPeriods)
		res.status(500).send("Error while fetching data")
		return
	}

	const [errJsonPeriods, jsonPeriods] = await to(fetchResPeriods.json())
	if (errJsonPeriods) {
		console.error(errJsonPeriods)
		res.status(500).send("Error while parsing data")
		return
	}

	const [errFetchResHours, fetchResHours] = await to(
		fetch(
			`https://api.meteo-concept.com/api/forecast/daily/nextHours?insee=${INSEE}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${env.API_KEY}`,
				},
			},
		),
	)

	if (errFetchResHours) {
		console.error(errFetchResHours)
		res.status(500).send("Error while fetching data")
		return
	}

	const [errJsonHours, jsonHours] = await to(fetchResHours.json())

	if (errJsonHours) {
		console.error(errJsonHours)
		res.status(500).send("Error while parsing data")
		return
	}

	const data = {
		periods: jsonPeriods,
		hours: jsonHours,
	}

	cache = {
		timestamp: Date.now(),
		data,
	}

	res.status(200).json(jsonPeriods)
})

app.listen(env.PORT, () => {
	console.info(`Server listening on port ${env.PORT}`)
})
