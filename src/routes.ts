import express from 'express'
import { cas_server_base_url, hydraAdmin, our_base_url } from './config'
import { handle_error, casv2_validate_ticket } from './helpers'


const router = express.Router()

router.get('/login', handle_error(async (req, res) => {
    const challenge = String(req.query.login_challenge)
    if (!challenge) throw new Error('Expected a login challenge')
    
    const ourUrl = our_base_url + '/login?login_challenge=' + encodeURIComponent(challenge)
    if (!req.query.ticket) {
        res.redirect(cas_server_base_url + "/login?service=" + encodeURIComponent(ourUrl))
    } else {
        const { data: loginRequest } = await hydraAdmin.getLoginRequest(challenge) // needed?
        
        const cas_response = await casv2_validate_ticket(ourUrl, String(req.query.ticket))

        // tell hydra:
        const { data: acceptResp } = await hydraAdmin.acceptLoginRequest(challenge, { 
            subject: cas_response.subject,
            context: cas_response,
        })
        // redirect the user back to hydra
        res.redirect(String(acceptResp.redirect_to))
    }
}))

router.get('/consent', handle_error(async (req, res) => {
    const challenge = String(req.query.consent_challenge)
    if (!challenge) throw new Error('Expected a consent challenge')
    
    const { data: consentRequest } = await hydraAdmin.getConsentRequest(challenge)
    
    const { data: acceptResp } = await hydraAdmin.acceptConsentRequest(challenge, {
            // give what was requested and checked by hydra:
            grant_scope: consentRequest.requested_scope,
            grant_access_token_audience: consentRequest.requested_access_token_audience,

            session: {
              // @ts-ignore
              id_token: { email: consentRequest.context?.email },
            }
    })
    // redirect the user back to hydra!
    res.redirect(String(acceptResp.redirect_to))
}))

router.get('/logout', handle_error(async (req, res) => {
    const challenge = String()
    if (!challenge) throw Error('Expected a logout challenge')
    await hydraAdmin.getLogoutRequest(challenge) // needed?
    
    res.redirect(cas_server_base_url + '/logout')
}))

export default router
