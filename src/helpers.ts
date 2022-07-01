import express from 'express'
import fetch from 'node-fetch'
import { cas_server_base_url } from './config'

// to remove with Express v5, see https://stackoverflow.com/a/38083802/3005203
export const handle_error = (callback: (req : express.Request, res: express.Response) => Promise<void>): express.RequestHandler => async (req, res) => {
    try {
        await callback(req, res)
    } catch (err) {
        console.error(err)
        res.send("err")
    }
}

export async function casv2_validate_ticket(ourUrl: string, ticket: string) {
    const params = { service: ourUrl, ticket }
    const url = cas_server_base_url + '/serviceValidate?' + new URLSearchParams(params).toString()
    const response = await fetch(url)
    if (response.ok) {
        const body = await response.text();
        const m = body.match(/<cas:authenticationSuccess>/) && body.match(/<cas:user>(.*?)<\/cas:user>/)
        if (m) {
            const email = body.match(/<cas:mail>(.*?)<\/cas:mail>/)?.[1]
            return { subject: m[1], email }
        }
        const err = body.match(/<cas:authenticationFailure code="(.*)">(.*?)</)
        if (err) throw { code: err[1], msg: err[2] }
    }
    throw { msg: "Problème technique, veuillez ré-essayer plus tard." }
}
