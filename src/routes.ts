import express from 'express'
import { cas_server_base_url, hydraAdmin, our_base_url, supann_to_oidc_attr } from './config'
import { handle_error, casv2_validate_ticket } from './helpers'


const router = express.Router()

router.get('/login', handle_error(async (req, res) => {
    const loginChallenge = String(req.query.login_challenge)
    if (!loginChallenge) throw new Error('Expected a login challenge')

    const { data: loginRequest } = await hydraAdmin.getOAuth2LoginRequest({ loginChallenge }) // needed?
    
    const ourUrl = our_base_url + '/login?login_challenge=' + encodeURIComponent(loginChallenge)
    if (!req.query.ticket) {
        res.redirect(cas_server_base_url + "/login?service=" + encodeURIComponent(ourUrl))
    } else {
        
        const cas_response = await casv2_validate_ticket(supann_to_oidc_attr, ourUrl, String(req.query.ticket))

        // tell hydra:
        const { data: acceptResp } = await hydraAdmin.acceptOAuth2LoginRequest({ loginChallenge, acceptOAuth2LoginRequest: { 
            subject: String(cas_response.subject),
            context: cas_response,
        } })
        // redirect the user back to hydra
        res.redirect(String(acceptResp.redirect_to))
    }
}))

router.get('/consent', handle_error(async (req, res) => {
    const consentChallenge = String(req.query.consent_challenge)
    if (!consentChallenge) throw new Error('Expected a consent challenge')
    
    const { data: consentRequest } = await hydraAdmin.getOAuth2ConsentRequest({ consentChallenge })
    
    const { data: acceptResp } = await hydraAdmin.acceptOAuth2ConsentRequest({ consentChallenge, acceptOAuth2ConsentRequest: {
            // give what was requested and checked by hydra:
            grant_scope: consentRequest.requested_scope,
            grant_access_token_audience: consentRequest.requested_access_token_audience,

            session: {
              id_token: consentRequest.context,
            }
    } })
    // redirect the user back to hydra!
    res.redirect(String(acceptResp.redirect_to))
}))

router.get('/logout', handle_error(async (req, res) => {
    const logoutChallenge = String()
    if (!logoutChallenge) throw Error('Expected a logout challenge')
    await hydraAdmin.getOAuth2LogoutRequest({ logoutChallenge }) // needed?
    
    res.redirect(cas_server_base_url + '/logout')
}))

export default router
